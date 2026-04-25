function generateReferenceId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INTAKE-${stamp}-${random}`;
}

function normalizeProjectType(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'residential solar') return 'residential_solar';
  if (value === 'commercial solar') return 'commercial_solar';
  if (value === 'bess') return 'bess';
  if (value === 'data center') return 'data_center';
  return 'unknown';
}

function normalizeTimeline(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value.includes('0-3')) return '0_3_months';
  if (value.includes('3-6')) return '3_6_months';
  if (value.includes('6-12')) return '6_12_months';
  if (value.includes('12+')) return '12_plus_months';
  return 'unknown';
}

function normalizeDecisionAuthority(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value.includes('final')) return 'final_decision_maker';
  if (value.includes('influencer')) return 'influencer';
  if (value.includes('technical')) return 'technical_evaluator';
  if (value.includes('unknown')) return 'unknown';
  return 'unknown';
}

function normalizeFinancing(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value.includes('cash')) return 'cash_purchase';
  if (value.includes('loan') || value.includes('debt')) return 'loan_debt';
  if (value.includes('lease') || value.includes('ppa') || value.includes('esa')) return 'lease_ppa_esa';
  if (value.includes('undecided')) return 'undecided';
  return 'unknown';
}

function normalizeRoofType(raw) {
  return String(raw || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'unknown';
}

function normalizeState(raw) {
  return String(raw || '').trim().toUpperCase().slice(0, 2);
}

function numberOrNull(raw) {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function isMissing(value) {
  return value == null || String(value).trim() === '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }

  let body = req.body || {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body || '{}');
    } catch (error) {
      return res.status(400).json({ ok: false, error: 'Invalid JSON payload' });
    }
  }

  const requiredFields = ['name', 'company', 'email', 'phone', 'projectType', 'monthlyUtilitySpend', 'buildingSqft', 'roofType', 'serviceState', 'timeline', 'decisionAuthority', 'financingPreference'];
  const missing = requiredFields.filter((key) => isMissing(body[key]));

  if (missing.length > 0) {
    return res.status(400).json({ ok: false, error: `Missing required fields: ${missing.join(', ')}` });
  }

  if (body.tribalProject && isMissing(body.tribalNationAgency)) {
    return res.status(400).json({ ok: false, error: 'tribalNationAgency is required for tribal projects' });
  }

  const referenceId = generateReferenceId();
  const nowIso = new Date().toISOString();

  const normalized = {
    projectTypeNormalized: normalizeProjectType(body.projectType),
    timelineNormalized: normalizeTimeline(body.timeline),
    decisionAuthorityNormalized: normalizeDecisionAuthority(body.decisionAuthority),
    financingPreferenceNormalized: normalizeFinancing(body.financingPreference),
    roofTypeNormalized: normalizeRoofType(body.roofType),
    serviceStateNormalized: normalizeState(body.serviceState),
    isTribalProject: Boolean(body.tribalProject),
    monthlyUtilitySpendUsd: numberOrNull(body.monthlyUtilitySpend),
    buildingSqft: numberOrNull(body.buildingSqft)
  };

  const airtableFields = {
    'Reference ID': referenceId,
    'Submitted At': nowIso,
    'Full Name': String(body.name || '').trim(),
    'Company / Organization': String(body.company || '').trim(),
    'Email': String(body.email || '').trim(),
    'Phone': String(body.phone || '').trim(),
    'Project Type': String(body.projectType || '').trim(),
    'Project Type Normalized': normalized.projectTypeNormalized,
    'Monthly Utility Spend (USD)': normalized.monthlyUtilitySpendUsd,
    'Building Sqft': normalized.buildingSqft,
    'Roof Type': String(body.roofType || '').trim(),
    'Roof Type Normalized': normalized.roofTypeNormalized,
    'Service State': String(body.serviceState || '').trim(),
    'Service State Normalized': normalized.serviceStateNormalized,
    'Tribal Project': normalized.isTribalProject ? 'Yes' : 'No',
    'Nation / Agency': String(body.tribalNationAgency || '').trim(),
    'Timeline': String(body.timeline || '').trim(),
    'Timeline Normalized': normalized.timelineNormalized,
    'Decision Authority': String(body.decisionAuthority || '').trim(),
    'Decision Authority Normalized': normalized.decisionAuthorityNormalized,
    'Financing Preference': String(body.financingPreference || '').trim(),
    'Financing Preference Normalized': normalized.financingPreferenceNormalized,
    'Notes': String(body.notes || '').trim(),
    'Opt In': body.optin ? 'Yes' : 'No',
    'Lead Channel': String(body.channel || 'form_snapshot').trim(),
    'Page URL': String(body.pageUrl || '').trim(),
    'UTM Source': String(body.utm_source || '').trim(),
    'UTM Medium': String(body.utm_medium || '').trim(),
    'UTM Campaign': String(body.utm_campaign || '').trim(),
    'UTM Term': String(body.utm_term || '').trim(),
    'UTM Content': String(body.utm_content || '').trim()
  };

  try {
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: [{ fields: airtableFields }] })
    });

    if (!response.ok) {
      const airtableError = await response.text();
      return res.status(502).json({ ok: false, error: 'Airtable write failed', referenceId, detail: airtableError });
    }

    return res.status(200).json({ ok: true, referenceId });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Intake processing failed', referenceId });
  }
}
