const express = require('express');
const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

// ══════════════════════════════════════════
// ENV VARS — set in Render dashboard:
// OPENAI_API_KEY
// BLAND_API_KEY        → from app.bland.ai
// BLAND_FROM_NUMBER    → your Bland.ai phone number (optional)
// TWILIO_ACCOUNT_SID   → from console.twilio.com
// TWILIO_AUTH_TOKEN    → from console.twilio.com
// TWILIO_FROM_NUMBER   → +14155238886 (sandbox)
// OWNER_WHATSAPP       → +447385639105
// ══════════════════════════════════════════

// ── MGR AI PHONE SCRIPT ──────────────────
// This is what the AI says when it calls a lead
const MGR_CALL_SCRIPT = `
You are Sophia, the professional AI assistant for MGR Maintenance & Renovation, 
a leading building and renovation company in London established in 2016.

YOUR MISSION on this call:
1. Warmly introduce yourself as calling from MGR Maintenance
2. Ask what building work they need (refurbishment, kitchen, bathroom, decorating, plumbing, electrical, commercial)
3. Ask for their postcode to confirm MGR covers their area (all London boroughs)
4. Ask for a rough idea of their budget or size of project
5. Make a compelling offer: "We're currently offering FREE site visits with a written quote — no obligation"
6. Emphasise: 10 years experience, fully insured, 250+ happy clients, competitive pricing
7. Try to book a site visit: "Would you like one of our expert team to visit you this week?"
8. If they're interested, confirm their details and tell them a manager will call to confirm the exact date
9. If they're not ready, leave the door open: "No problem at all — our number is 07385 639105 whenever you're ready"
10. Always be friendly, professional, and never pushy

KEY SERVICES TO MENTION (based on what they need):
- Full Refurbishment: "We handle everything from start to finish"
- Kitchen/Bathroom: "Our most popular service — completely transformed in 2-3 weeks"
- Decorating: "Internal and external, we use premium materials"
- Plumbing/Electrical: "Certified engineers, same-week availability"
- Commercial: "We work with offices, restaurants, retail — minimal disruption"

PRICING GUIDE (use to reassure, not commit):
- Bathroom from £3,000 | Kitchen from £8,000 | Full refurb from £15,000
- Always say "We'll give you an exact written quote after the free site visit — no surprises"

HANDLING OBJECTIONS:
- "Too expensive": "We offer competitive pricing and can work within most budgets — the quote is free and there's no obligation"
- "Already have someone": "Of course, but our free quote means you can compare — most clients are pleasantly surprised"
- "Not ready yet": "No problem, would it be ok if we follow up in a few weeks?"
- "How long does it take": Give realistic timeframes, emphasise minimal disruption

TONE: Warm, confident, professional British English. Never robotic. Natural pauses.
`;

// ── MGR OUTBOUND ADVERTISING CALL SCRIPT ──
const MGR_AD_CALL_SCRIPT = `
You are Sophia from MGR Maintenance & Renovation London. 
You are making a brief, friendly outreach call to someone who showed interest in home improvement services online.

KEEP IT SHORT — under 90 seconds unless they engage:
1. "Hi, is this [name]? This is Sophia calling from MGR Maintenance in London — you recently looked at home renovation services online"
2. Briefly pitch the current offer: "We're running a special promotion — FREE site visits and written quotes this month for kitchen, bathroom and full property refurbishment"
3. Ask ONE question: "Are you currently looking to do any work on your property?"
4. If YES → get details and offer to book
5. If NO → "No problem at all — I'll leave our number: 07385 639105. We cover all of London. Have a great day!"

Never be pushy. Always polite. Max 2 minutes.
`;

const CHAT_SYSTEM = `You are the friendly AI assistant for MGR Maintenance & Renovation, 
a professional construction and refurbishment company in London, UK, established 2016.
Services: Refurbishment, General Building, Decorating, Repairs, Plumbing, Electrical, Commercial Fit-Out.
Contact: info@grmaintenance.co.uk | Phone: 07385 639105 | Mon-Sat 8am-6pm.
250+ clients, 10 years experience. Fully insured. Free quotes.
Pricing: Bathroom £3k-£15k+, Kitchen £8k-£30k+, Extension £30k-£100k+, Decoration £2k-£8k+.
Be friendly and concise. Always push for a free quote or site visit.`;

// ══════════════════════════════════════════
// 1. AI CHAT
// ══════════════════════════════════════════
app.post('/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: 'messages required' });
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 600, messages: [{ role: 'system', content: CHAT_SYSTEM }, ...messages] })
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    res.json({ reply: d.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ reply: 'Something went wrong. Call us on 07385 639105.' });
  }
});

// ══════════════════════════════════════════
// 2. AI PHONE CALL — INBOUND (lead requested callback)
// ══════════════════════════════════════════
app.post('/request-callback', async (req, res) => {
  const { name, phone, best_time, service } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });

  let num = phone.replace(/\s/g, '');
  if (num.startsWith('07')) num = '+44' + num.slice(1);
  if (num.startsWith('7')) num = '+44' + num;

  try {
    if (process.env.BLAND_API_KEY) {
      const blandRes = await fetch('https://api.bland.ai/v1/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'authorization': process.env.BLAND_API_KEY },
        body: JSON.stringify({
          phone_number: num,
          task: MGR_CALL_SCRIPT,
          voice: 'sophia',  // Professional female British voice
          first_sentence: `Hello, am I speaking with ${name}? This is Sophia calling from MGR Maintenance & Renovation in London — you requested a call back from our website. Is now a good time to chat?`,
          wait_for_greeting: true,
          record: true,
          max_duration: 8,
          answered_by_enabled: true,
          language: 'en-GB',
          // Webhook to get call summary back
          webhook: process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL + '/bland-webhook' : null,
          metadata: { name, phone, service: service || 'Unknown', type: 'inbound_callback' }
        })
      });
      const blandData = await blandRes.json();
      console.log('Bland.ai call:', blandData.call_id || blandData);
    }

    // WhatsApp to owner
    await sendWhatsApp(
      `📞 *AI CALL TRIGGERED — MGR*\n\n` +
      `👤 Name: ${name}\n📞 Phone: ${phone}\n` +
      `🔧 Service: ${service || 'General enquiry'}\n🕐 Best time: ${best_time || 'Any'}\n\n` +
      `🤖 Sophia AI is calling them now automatically.`
    );

    res.json({ success: true, message: 'AI call initiated' });
  } catch (e) {
    console.error('Callback error:', e);
    res.json({ success: true });
  }
});

// ══════════════════════════════════════════
// 3. AI OUTBOUND ADVERTISING CALL
//    Call this from Zapier/Meta Ads webhook
//    when someone clicks your Facebook/Google ad
// ══════════════════════════════════════════
app.post('/outbound-call', async (req, res) => {
  const { name, phone, source } = req.body; // source = 'facebook_ad' | 'google_ad' | 'manual'
  if (!phone) return res.status(400).json({ error: 'phone required' });

  let num = phone.replace(/\s/g, '');
  if (num.startsWith('07')) num = '+44' + num.slice(1);
  if (num.startsWith('7')) num = '+44' + num;

  try {
    if (process.env.BLAND_API_KEY) {
      const r = await fetch('https://api.bland.ai/v1/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'authorization': process.env.BLAND_API_KEY },
        body: JSON.stringify({
          phone_number: num,
          task: MGR_AD_CALL_SCRIPT,
          voice: 'sophia',
          first_sentence: `Hi, is this ${name || 'there'}? This is Sophia calling from MGR Maintenance in London — I'm reaching out about home renovation and building services in your area. Do you have 60 seconds?`,
          wait_for_greeting: true,
          record: true,
          max_duration: 4,
          answered_by_enabled: true,
          language: 'en-GB',
          webhook: process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL + '/bland-webhook' : null,
          metadata: { name, phone, source: source || 'outbound', type: 'advertising_call' }
        })
      });
      const d = await r.json();
      console.log('Outbound ad call:', d.call_id);
    }

    await sendWhatsApp(
      `📣 *OUTBOUND AD CALL TRIGGERED*\n\n` +
      `👤 ${name || 'Unknown'}\n📞 ${phone}\n🌐 Source: ${source || 'Manual'}\n\n` +
      `🤖 Sophia AI is calling them now.`
    );

    res.json({ success: true });
  } catch (e) {
    console.error('Outbound call error:', e);
    res.json({ success: true });
  }
});

// ══════════════════════════════════════════
// 4. BLAND.AI WEBHOOK — receives call summary
//    Bland.ai calls this after each call ends
// ══════════════════════════════════════════
app.post('/bland-webhook', async (req, res) => {
  const { call_id, status, summary, transcript, metadata, duration } = req.body;
  console.log('Call completed:', call_id, status);

  const name = metadata?.name || 'Unknown';
  const phone = metadata?.phone || 'Unknown';
  const type = metadata?.type || 'call';
  const mins = duration ? Math.round(duration / 60) : 0;

  // Send WhatsApp summary to owner
  const msg =
    `📋 *CALL COMPLETED — MGR AI*\n\n` +
    `👤 ${name} | 📞 ${phone}\n` +
    `⏱ Duration: ${mins} min\n` +
    `📊 Status: ${status}\n\n` +
    `📝 Summary:\n${summary || 'No summary available'}\n\n` +
    `💡 Check dashboard for full transcript.`;

  await sendWhatsApp(msg);

  // If call was interested — follow up with WhatsApp to the lead
  if (summary && (summary.toLowerCase().includes('interested') || summary.toLowerCase().includes('quote') || summary.toLowerCase().includes('visit'))) {
    await sendWhatsAppToLead(phone,
      `Hi ${name}! 👋 This is MGR Maintenance following up on our call.\n\n` +
      `We'd love to arrange your FREE site visit and written quote.\n\n` +
      `📞 Call us: 07385 639105\n🌐 Book online: mgrmaintenance.uk\n\n` +
      `Looking forward to helping with your project! 🏠`
    );
  }

  res.sendStatus(200);
});

// ══════════════════════════════════════════
// 5. NOTIFY LEAD (form submission alert)
// ══════════════════════════════════════════
app.post('/notify-lead', async (req, res) => {
  const { name, phone, email, service, postcode, message, source } = req.body;
  try {
    await sendWhatsApp(
      `🚨 *NEW LEAD — MGR Website*\n\n` +
      `👤 ${name||'N/A'}\n📞 ${phone||'N/A'}\n📧 ${email||'N/A'}\n` +
      `📍 ${postcode||'N/A'}\n🔧 ${service||'N/A'}\n💬 ${message||'N/A'}\n🌐 ${source||'Website'}\n\n` +
      `⚡ AI is calling them automatically!`
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: true });
  }
});

// ══════════════════════════════════════════
// 6. CONTENT TOOL (email/ad copy generator)
// ══════════════════════════════════════════
app.post('/tool', async (req, res) => {
  const { system, message } = req.body;
  if (!system || !message) return res.status(400).json({ error: 'system and message required' });
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1000, messages: [{ role: 'system', content: system }, { role: 'user', content: message }] })
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    res.json({ reply: d.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ reply: 'Could not generate content.' });
  }
});

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════
async function sendWhatsApp(body) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('WhatsApp (no Twilio):', body.substring(0, 100));
    return;
  }
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}` },
    body: new URLSearchParams({
      From: `whatsapp:${process.env.TWILIO_FROM_NUMBER || '+14155238886'}`,
      To: `whatsapp:${process.env.OWNER_WHATSAPP || '+447385639105'}`,
      Body: body
    })
  });
}

async function sendWhatsAppToLead(phone, body) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return;
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  let num = phone.replace(/\s/g, '');
  if (num.startsWith('07')) num = '+44' + num.slice(1);
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}` },
    body: new URLSearchParams({
      From: `whatsapp:${process.env.TWILIO_FROM_NUMBER || '+14155238886'}`,
      To: `whatsapp:${num}`,
      Body: body
    })
  });
}

app.get('/', (req, res) => res.send('MGR AI Server ✓ v3 — AI Calls + Advertising Active'));
app.listen(process.env.PORT || 3000, () => console.log('MGR Server v3 ready'));
