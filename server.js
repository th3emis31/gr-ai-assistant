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
 
const CHAT_SYSTEM = `You are the friendly AI assistant for MGR Maintenance & Renovation, a professional construction and refurbishment company in London, UK, established 2016.
Services: Refurbishment, General Building, Decorating, Repairs & Maintenance, Plumbing, Electrical, Commercial Fit-Out, Residential Projects.
Contact: info@grmaintenance.co.uk | Phone: 07385 639105 | Mon-Sat 8am-6pm.
250+ clients, 310+ projects, 10 years experience. Fully insured. Free quotes available.
Pricing: Bathroom £3k-£15k+, Kitchen £8k-£30k+, Extension £30k-£100k+, Decoration £2k-£8k+.
Be friendly and concise. Always suggest a free quote.`;
 
// ═══ 1. AI CHAT ═══
app.post('/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 600, messages: [{ role: 'system', content: CHAT_SYSTEM }, ...messages] })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ reply: 'Something went wrong. Please contact info@grmaintenance.co.uk.' });
  }
});
 
// ═══ 2. AI PHONE CALL — Bland.ai ═══
app.post('/request-callback', async (req, res) => {
  const { name, phone, best_time } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });
 
  let phoneNum = phone.replace(/\s/g, '');
  if (phoneNum.startsWith('07')) phoneNum = '+44' + phoneNum.slice(1);
  if (phoneNum.startsWith('7')) phoneNum = '+44' + phoneNum;
 
  try {
    // Trigger Bland.ai AI call
    if (process.env.BLAND_API_KEY) {
      await fetch('https://api.bland.ai/v1/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'authorization': process.env.BLAND_API_KEY },
        body: JSON.stringify({
          phone_number: phoneNum,
          task: `You are calling on behalf of MGR Maintenance & Renovation London. You're calling ${name} who requested a callback from the MGR website. Ask: 1) What building work do they need? 2) Their postcode. 3) Brief description. Then tell them a team member will call with a free quote within 24 hours. Be professional and friendly. Keep it under 3 minutes.`,
          voice: 'josh',
          first_sentence: `Hello, is this ${name}? This is the MGR Maintenance assistant calling you back about your website enquiry.`,
          wait_for_greeting: true,
          record: true,
          max_duration: 4
        })
      });
    }
 
    // WhatsApp alert to owner
    await sendWhatsApp(`🔔 *CALL BACK REQUEST — MGR*\n\n👤 ${name}\n📞 ${phone}\n🕐 Best time: ${best_time || 'Any'}\n\n${process.env.BLAND_API_KEY ? '✅ AI call triggered automatically' : '⚠️ Call them manually'}`);
 
    res.json({ success: true });
  } catch (err) {
    console.error('Callback error:', err);
    res.json({ success: true });
  }
});
 
// ═══ 3. INSTANT NOTIFICATION — new lead ═══
app.post('/notify-lead', async (req, res) => {
  const { name, phone, email, service, postcode, message, source } = req.body;
  try {
    const msg = `🚨 *NEW LEAD — MGR Website*\n\n👤 ${name||'N/A'}\n📞 ${phone||'N/A'}\n📧 ${email||'N/A'}\n📍 ${postcode||'N/A'}\n🔧 ${service||'N/A'}\n💬 ${message||'N/A'}\n🌐 ${source||'Website'}\n\n⚡ Call within 1 hour!`;
    await sendWhatsApp(msg);
    res.json({ success: true });
  } catch (err) {
    console.error('Notify error:', err);
    res.json({ success: true });
  }
});
 
// ═══ 4. APPOINTMENT — Calendly webhook ═══
app.post('/calendly-webhook', async (req, res) => {
  const event = req.body;
  if (event.event === 'invitee.created') {
    const inv = event.payload?.invitee;
    const time = event.payload?.scheduled_event?.start_time;
    await sendWhatsApp(`📅 *APPOINTMENT BOOKED — MGR*\n\n👤 ${inv?.name||'Unknown'}\n📧 ${inv?.email||'N/A'}\n🕐 ${time ? new Date(time).toLocaleString('en-GB') : 'See Calendly'}`);
  }
  res.sendStatus(200);
});
 
// ═══ 5. CONTENT TOOL ═══
app.post('/tool', async (req, res) => {
  const { system, message } = req.body;
  if (!system || !message) return res.status(400).json({ error: 'system and message required' });
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1000, messages: [{ role: 'system', content: system }, { role: 'user', content: message }] })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ reply: 'Could not generate content.' });
  }
});
 
// ═══ HELPER: Send WhatsApp via Twilio ═══
async function sendWhatsApp(body) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('WhatsApp (no Twilio):', body);
    return;
  }
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${auth}` },
    body: new URLSearchParams({
      From: `whatsapp:${process.env.TWILIO_FROM_NUMBER || '+14155238886'}`,
      To: `whatsapp:${process.env.OWNER_WHATSAPP || '+447385639105'}`,
      Body: body
    })
  });
  const d = await r.json();
  console.log('WhatsApp sent:', d.sid || d.message);
}
 
app.get('/', (req, res) => res.send('MGR AI Server ✓ — All systems active'));
app.listen(process.env.PORT || 3000, () => console.log('MGR Server ready'));
