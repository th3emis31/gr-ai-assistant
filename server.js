udflare worker · JS
Copy

/**
 * GR Maintenance – Cloudflare Worker AI Proxy
 * 
 * SETUP (takes ~2 minutes):
 * 1. Go to https://workers.cloudflare.com and sign up free
 * 2. Click "Create Worker" → paste this entire file → click "Deploy"
 * 3. Go to Settings → Variables → add a SECRET called ANTHROPIC_API_KEY
 *    with your Anthropic API key as the value
 * 4. Copy your Worker URL (looks like: https://gr-ai.YOUR-NAME.workers.dev)
 * 5. Paste that URL into the HTML file where it says AI_PROXY_URL
 */
 
const SYSTEM_PROMPT = `You are the friendly AI assistant for GR Maintenance Ltd, a professional construction and refurbishment company based in London, UK, operating since 2015.
 
Services offered:
- Refurbishment (bathrooms, kitchens, full properties)
- General Building (extensions, new builds, maintenance)
- Decorating (interior & exterior)
- Repairs & Maintenance (plumbing, gas, electrical, lighting)
- Commercial Fit-Out (restaurants, offices, retail)
- Residential Projects (loft conversions, extensions, renovations)
 
Key facts:
- Based in London, covering all London boroughs and surrounding areas
- 15+ years management experience, over 250 happy clients, 310+ projects completed
- Contact: info@grmaintenance.co.uk | WhatsApp: 07713 982909
- Hours: Mon–Sat 8am–6pm
- Fully insured, accredited and qualified tradespeople
- Free no-obligation quotes always available
 
Pricing guidance (rough London estimates):
- Bathroom refurb: £3,000–£15,000+
- Kitchen refurb: £8,000–£30,000+
- House extension: £30,000–£100,000+
- Loft conversion: £40,000–£80,000+
- Decoration (full house): £2,000–£8,000+
- Commercial fit-out: £15,000–£200,000+
 
Keep answers friendly, professional and concise (2–4 sentences max). Always encourage getting a free quote for accurate pricing.`;
 
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
 
export default {
  async fetch(request, env) {
 
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
 
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }
 
    try {
      const { messages } = await request.json();
 
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages,
        }),
      });
 
      const data = await response.json();
      const reply = data.content?.[0]?.text || 'Sorry, I could not generate a response.';
 
      return new Response(JSON.stringify({ reply }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
 
    } catch (err) {
      return new Response(JSON.stringify({ reply: 'Something went wrong. Please contact info@grmaintenance.co.uk.' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
