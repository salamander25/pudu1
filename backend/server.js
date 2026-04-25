const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LEADS_FILE = path.join(__dirname, 'leads.json');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM_NUMBER;

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

function loadLeads() {
  if (!fs.existsSync(LEADS_FILE)) return [];
  return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
}

function saveLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

app.post('/api/lead', async (req, res) => {
  const { first_name, last_name, phone, address, consent } = req.body;

  if (!first_name || !last_name || !phone || !address) {
    return res.status(400).json({ error: 'Missing required lead fields' });
  }

  const lead = {
    first_name: String(first_name).trim(),
    last_name: String(last_name).trim(),
    phone: normalizePhone(phone),
    address: String(address).trim(),
    consent: Boolean(consent),
    timestamp: new Date().toISOString(),
    source: 'website',
    lead_score: null,
    status: 'new'
  };

  const leads = loadLeads();
  leads.push(lead);
  saveLeads(leads);

  if (lead.consent && twilioClient && twilioFrom) {
    try {
      await twilioClient.messages.create({
        body: 'Sol Solar Solutions: Thanks for requesting your solar quote. Reply STOP to opt out.',
        from: twilioFrom,
        to: lead.phone
      });
    } catch (error) {
      console.error('Twilio send error:', error.message);
    }
  }

  if (process.env.N8N_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
    } catch (error) {
      console.error('n8n webhook error:', error.message);
    }
  }

  return res.status(201).json({ success: true, lead });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'sol-solar-lead-api' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
