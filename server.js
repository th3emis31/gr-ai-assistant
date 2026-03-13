const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

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

app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
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
    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: 'Something went wrong. Please contact info@grmaintenance.co.uk.' });
  }
});

app.get('/', (req, res) => res.send('GR Maintenance AI server is running.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
