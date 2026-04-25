# Sol Solar SMS Funnel Deployment Guide

## 1) Backend (Render or Railway)

1. Deploy `backend/` as a Node service.
2. Set environment variables:
   - `PORT=3000`
   - `TWILIO_ACCOUNT_SID=...`
   - `TWILIO_AUTH_TOKEN=...`
   - `TWILIO_FROM_NUMBER=+1XXXXXXXXXX`
   - `N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/sol-solar-lead` (optional)
3. Install dependencies:
   ```bash
   cd backend
   npm install
   npm start
   ```
4. Confirm HTTPS endpoint is public, e.g. `https://your-api.onrender.com/api/lead`.

## 2) Frontend (Vercel or Netlify)

1. Deploy `frontend/index.html` as static site.
2. Ensure form POST target routes to backend:
   - If frontend/backend are separate domains, change `fetch('/api/lead')` to full backend URL.
3. Publish over HTTPS.

## 3) Legal Pages

Deploy these public pages (same domain preferred):
- `/privacy-policy.html`
- `/terms.html`

Twilio reviewers must be able to access these links publicly.

## 4) n8n Workflow

1. Import `n8n/sol-solar-optin-workflow.json`.
2. Connect credentials for Airtable and Twilio.
3. Update sender number and webhook paths.
4. Set Twilio inbound webhook to n8n reply endpoint (`/webhook/sol-solar-reply`).

## 5) Database Structure

Leads table fields:
- `first_name` (text)
- `last_name` (text)
- `phone` (text)
- `address` (text)
- `consent` (boolean)
- `timestamp` (datetime)
- `lead_score` (number)
- `status` (new/hot/warm/cold)
- `source` (text)

## 6) Optional Double Opt-In

Recommended first SMS:
"Reply YES to confirm you want to receive solar updates from Sol Solar Solutions."

Only proceed with campaign messages if inbound reply is `YES`.
