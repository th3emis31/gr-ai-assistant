const express = require('express');
const app = express();
 
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
 
app.use(express.json());
 
const CHAT_SYSTEM = `You are the friendly AI assistant for GR Maintenance Ltd, a professional construction and refurbishment company in London, UK, since 2015.
 
Services: Refurbishment, General Building, Decorating, Repairs & Maintenance, Commercial Fit-Out, Residential Projects.
Contact: info@grmaintenance.co.uk | WhatsApp: 07713 982909 | Mon-Sat 8am-6pm.
250+ clients, 310+ projects, 15+ years experience. Fully insured. Free quotes available.
 
Pricing (London estimates): Bathroom £3k-£15k+, Kitchen £8k-£30k+, Extension £30k-£100k+, Loft £40k-£80k+, Decoration £2k-£8k+, Commercial £15k-£200k+.
 
Be friendly and concise. Always suggest a free quote for accurate pricing.`;
 
// Chat endpoint — multi-turn conversation
app.post('/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        messages: [{ role: 'system', content: CHAT_SYSTEM }, ...messages]
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: 'Something went wrong. Please contact info@grmaintenance.co.uk.' });
  }
});
 
// Tool endpoint — email/WhatsApp/ad generation
app.post('/tool', async (req, res) => {
  const { system, message } = req.body;
  if (!system || !message) {
    return res.status(400).json({ error: 'system and message required' });
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: message }
        ]
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: 'Could not generate content. Please try again.' });
  }
});
 
app.get('/', (req, res) => res.send('GR AI server running ✓'));
 
app.listen(process.env.PORT || 3000, () => console.log('Ready'));
