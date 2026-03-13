const express = require('express');
const app = express();

// Manual CORS middleware — handles preflight OPTIONS correctly
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

const SYSTEM = `You are the friendly AI assistant for GR Maintenance Ltd, a professional construction and refurbishment company in London, UK, since 2015.

Services: Refurbishment, General Building, Decorating, Repairs & Maintenance, Commercial Fit-Out, Residential Projects.
Contact: info@grmaintenance.co.uk | WhatsApp: 07713 982909 | Mon-Sat 8am-6pm.
250+ clients, 310+ projects, 15+ years experience. Fully insured. Free quotes available.

Pricing (London estimates): Bathroom £3k-£15k+, Kitchen £8k-£30k+, Extension £30k-£100k+, Loft £40k-£80k+, Decoration £2k-£8k+, Commercial £15k-£200k+.

Be friendly and concise. Always suggest a free quote for accurate pricing.`;

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
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM,
        messages
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ reply: data.content[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: 'Something went wrong. Please contact info@grmaintenance.co.uk.' });
  }
});

app.get('/', (req, res) => res.send('GR AI server running ✓'));

app.listen(process.env.PORT || 3000, () => console.log('Ready'));
