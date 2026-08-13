/**
 * Shared Google Ads API helper (kept OUTSIDE /api so Vercel does not route it).
 *
 * Google Ads is the SOURCE OF TRUTH for conversions, conversion value, ROAS and
 * geography. Credentials come from environment variables only — never committed.
 *
 * Required env vars (see docs/CREDENTIALS-AND-ACCESS.md):
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GOOGLE_ADS_REFRESH_TOKEN          (this is what is currently INVALID on the live
 *                                      deployment — /api/ads-report returns
 *                                      "invalid_grant" — it must be regenerated)
 *   GOOGLE_ADS_CUSTOMER_ID            digits only, no dashes (the Express Insurance account)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID      optional; the MCC id if accessed via a manager account
 *   GOOGLE_ADS_CAMPAIGN_MAP           optional JSON, e.g. {"Brand AU":"brand","PMax - All":"pmax"}
 *                                     maps live campaign names to the dashboard keys.
 *
 * Requires: npm install google-ads-api
 */

const REQUIRED = [
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN',
  'GOOGLE_ADS_CUSTOMER_ID',
];

// Dashboard campaign keys (order + metadata live in index.html CAMP_META/CAMP_ORDER).
const KEYS = ['brand', 'pmax', 'pi', 'acct', 'pl', 'eng', 'dg'];

// Full display names per key (kept in sync with index.html CAMP_META). Used so the API
// returns a human-readable "best campaign" name rather than the internal key.
const CAMPAIGN_NAMES = {
  brand: 'Brand', pmax: 'Performance Max', pi: 'Professional Indemnity',
  acct: 'Accountant Insurance', pl: 'Public Liability', eng: 'Engineers Search', dg: 'Demand Gen',
};

// Read a scalar env var and strip leading/trailing whitespace (spaces, tabs, CR, LF).
// Copy-pasting secrets into an env store often adds a stray newline; an untrimmed
// value breaks gRPC metadata ("Metadata string value contains illegal characters").
// Never logs the value.
function scalar(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : v;
}

// Normalised Google Ads scalar credentials (all trimmed). Exported for testing.
function readAdsEnv() {
  return {
    developer_token: scalar('GOOGLE_ADS_DEVELOPER_TOKEN'),
    client_id: scalar('GOOGLE_ADS_CLIENT_ID'),
    client_secret: scalar('GOOGLE_ADS_CLIENT_SECRET'),
    refresh_token: scalar('GOOGLE_ADS_REFRESH_TOKEN'),
    customer_id: scalar('GOOGLE_ADS_CUSTOMER_ID'),
    login_customer_id: scalar('GOOGLE_ADS_LOGIN_CUSTOMER_ID') || undefined,
  };
}

// A var that is absent or whitespace-only counts as missing.
function missingEnv() {
  return REQUIRED.filter((k) => !scalar(k));
}

// Default best-effort name -> key mapping. CONFIRM against the real account and
// override precisely with GOOGLE_ADS_CAMPAIGN_MAP. Unmatched campaigns are ignored.
function campaignKeyFor(name) {
  const override = process.env.GOOGLE_ADS_CAMPAIGN_MAP;
  if (override) {
    try {
      const map = JSON.parse(override);
      if (map[name]) return map[name];
    } catch (_) { /* fall through to heuristic */ }
  }
  const n = (name || '').toLowerCase();
  if (n.includes('brand')) return 'brand';
  if (n.includes('pmax') || n.includes('performance max')) return 'pmax';
  if (n.includes('professional indemnity') || /\bpi\b/.test(n)) return 'pi';
  if (n.includes('accountant')) return 'acct';
  if (n.includes('public liability') || /\bpl\b/.test(n)) return 'pl';
  if (n.includes('engineer')) return 'eng';
  if (n.includes('demand gen') || n.includes('demandgen')) return 'dg';
  return null;
}

function getCustomer() {
  const missing = missingEnv();
  if (missing.length) {
    const err = new Error('Google Ads not configured');
    err.code = 'NOT_CONFIGURED';
    err.missing = missing;
    throw err;
  }
  let GoogleAdsApi;
  try {
    ({ GoogleAdsApi } = require('google-ads-api'));
  } catch (e) {
    const err = new Error("Dependency missing: run 'npm install google-ads-api'");
    err.code = 'NO_DEP';
    throw err;
  }
  const cfg = readAdsEnv(); // trimmed — avoids illegal-metadata errors from stray whitespace
  const client = new GoogleAdsApi({
    client_id: cfg.client_id,
    client_secret: cfg.client_secret,
    developer_token: cfg.developer_token,
  });
  return client.Customer({
    customer_id: cfg.customer_id,
    login_customer_id: cfg.login_customer_id,
    refresh_token: cfg.refresh_token,
  });
}

// Convert a helper error into an HTTP response the dashboard understands.
function sendError(res, err) {
  if (err.code === 'NOT_CONFIGURED') {
    res.status(501).json({ error: 'Google Ads feed not configured', missing: err.missing, docs: 'docs/CREDENTIALS-AND-ACCESS.md' });
  } else if (err.code === 'NO_DEP') {
    res.status(501).json({ error: err.message });
  } else {
    // e.g. the current live blocker: {"error":"Token refresh failed: invalid_grant"}
    res.status(500).json({ error: 'Google Ads request failed', detail: String(err && err.message || err) });
  }
}

module.exports = { getCustomer, campaignKeyFor, sendError, missingEnv, readAdsEnv, KEYS, CAMPAIGN_NAMES };
