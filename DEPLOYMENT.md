# Sol Solar Solutions Deployment Guide

## 1) Frontend (Vercel or Netlify)

### Option A: Vercel
1. Push this repository to GitHub.
2. In Vercel, create a new project from the repo.
3. Set framework preset to **Other** (static).
4. Keep output as root so `frontend/index.html`, `privacy-policy.html`, and `terms.html` are public.
5. Deploy and verify:
   - `https://your-domain.com/frontend/index.html`
   - `https://your-domain.com/privacy-policy.html`
   - `https://your-domain.com/terms.html`

### Option B: Netlify
1. New site from Git.
2. Build command: _(none)_
3. Publish directory: `.`
4. Deploy and verify the same URLs above.

## 2) Backend (Render or Railway)

1. Create a new Web Service from this repository.
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables:
   - `PORT` (optional)
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER`
   - `N8N_WEBHOOK_URL` (optional)
6. Deploy and test:
   - `GET https://your-backend-domain.com/health`
   - `POST https://your-backend-domain.com/api/lead`

## 3) Connect frontend to backend

If frontend and backend are separate domains, update form submission URL in `frontend/index.html` from `/api/lead` to your full backend URL.

## 4) Twilio A2P readiness checklist

- Optional unchecked SMS checkbox on website.
- Consent language visible before submit.
- Privacy Policy and Terms publicly accessible.
- Consent + timestamp stored in backend lead record.
- STOP/HELP + message frequency + data rates disclosures included.

## 5) n8n setup

1. Import `n8n/sol-solar-sms-opt-in-workflow.json`.
2. Configure credentials for Airtable and Twilio.
3. Replace placeholder base/table IDs and Twilio number.
4. Activate only after webhook endpoints are accessible over HTTPS.
