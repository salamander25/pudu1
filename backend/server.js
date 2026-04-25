const express = require('express');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

const LEADS_FILE = path.join(__dirname, 'data', 'leads.json');
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

app.use(express.json());

function ensureLeadsStore() {
  const dir = path.dirname(LEADS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2));
  }
}

function readLeads() {
  ensureLeadsStore();
  const raw = fs.readFileSync(LEADS_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}

async function sendInitialSms(lead) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    return { sent: false, reason: 'Twilio credentials not configured' };
  }

  const client = twilio(accountSid, authToken);

  await client.messages.create({
    body: 'Sol Solar Solutions: Thanks for requesting your solar quote. Reply STOP to opt out.',
    from: fromPhone,
    to: lead.phone
  });

  return { sent: true };
}

async function postToN8n(payload) {
  if (!N8N_WEBHOOK_URL) {
    return { delivered: false, reason: 'N8N_WEBHOOK_URL not configured' };
  }

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`n8n webhook failed with ${response.status}`);
  }

  return { delivered: true };
}

app.post('/api/lead', async (req, res) => {
  const { first_name, last_name, phone, address, consent } = req.body || {};

  if (!first_name || !last_name || !phone || !address) {
    return res.status(400).json({ message: 'first_name, last_name, phone, and address are required.' });
  }

  const lead = {
    first_name: String(first_name).trim(),
    last_name: String(last_name).trim(),
    phone: String(phone).trim(),
    address: String(address).trim(),
    consent: Boolean(consent),
    timestamp: new Date().toISOString(),
    lead_score: 'cold',
    status: 'new',
    source: 'website'
  };

  const leads = readLeads();
  leads.push(lead);
  writeLeads(leads);

  const events = { sms: null, n8n: null };

  try {
    if (lead.consent) {
      events.sms = await sendInitialSms(lead);
    } else {
      events.sms = { sent: false, reason: 'No SMS consent provided' };
    }
  } catch (error) {
    events.sms = { sent: false, reason: error.message };
  }

  try {
    events.n8n = await postToN8n({ event: 'new_lead', lead, events });
  } catch (error) {
    events.n8n = { delivered: false, reason: error.message };
  }

  return res.status(201).json({
    message: 'Lead saved successfully.',
    lead,
    events
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
