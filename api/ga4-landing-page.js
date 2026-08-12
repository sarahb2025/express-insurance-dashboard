/**
 * GA4 live feed — LANDING PAGE traffic & engagement ONLY.
 * Route: GET /api/ga4-landing-page?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * GA4 is used ONLY for landing-page traffic and engagement metrics (per the
 * agreed source-of-truth split). It is NOT used for conversions, conversion
 * value, ROAS or geography — those come from Google Ads.
 *
 * Returns JSON consumed by renderLandingPage() in index.html:
 *   { page, propertyId, periodLabel,
 *     channels: [ { channel, sessions, keyEvents, convRate, bounceRate, engagement } ] }
 *   channel ∈ crossnet | paidsearch | direct | organic
 *
 * CREDENTIALS (env vars only — never commit secrets):
 *   GA4_PROPERTY_ID                    e.g. 358319621  (confirmed live on the current deployment)
 *   GA4_SA_EMAIL + GA4_SA_PRIVATE_KEY  service-account client_email + private_key
 *                                      (reuses the existing project's variables), OR
 *   GOOGLE_SERVICE_ACCOUNT_JSON        full service-account key JSON (raw or base64), OR
 *   GOOGLE_APPLICATION_CREDENTIALS     a key file path.
 * The service account must be granted "Viewer" on the GA4 property.
 * See docs/CREDENTIALS-AND-ACCESS.md and docs/INTEGRATIONS.md.
 *
 * Requires: npm install @google-analytics/data
 * If unconfigured this returns HTTP 501 and the dashboard keeps its placeholders.
 */

const LANDING_PAGE_PATH = '/professional-indemnity-insurance/accountants-insurance';

// GA4 default channel grouping -> the four cards in the dashboard
const CHANNEL_MAP = {
  'Cross-network': 'crossnet',
  'Paid Search': 'paidsearch',
  'Direct': 'direct',
  'Organic Search': 'organic',
};

function loadCredentials() {
  // Preferred: reuse the existing separate service-account vars (client_email + private_key).
  // Private keys stored in env vars usually carry literal "\n" — normalise to real newlines.
  if (process.env.GA4_SA_EMAIL && process.env.GA4_SA_PRIVATE_KEY) {
    return { credentials: {
      client_email: process.env.GA4_SA_EMAIL,
      private_key: process.env.GA4_SA_PRIVATE_KEY.replace(/\\n/g, '\n'),
    } };
  }
  // Alternative: a full service-account key JSON (raw or base64).
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    return { credentials: JSON.parse(text) };
  }
  // Alternative: GOOGLE_APPLICATION_CREDENTIALS file path (the client picks it up itself).
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return {};
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { start, end } = req.query || {};
  const propertyId = process.env.GA4_PROPERTY_ID;
  const creds = loadCredentials();

  // ---- Guard: not configured -> 501, dashboard keeps placeholders (nothing fabricated) ----
  if (!propertyId || creds === null) {
    res.status(501).json({
      error: 'GA4 landing-page feed not configured',
      missing: [!propertyId && 'GA4_PROPERTY_ID', creds === null && 'GA4_SA_EMAIL + GA4_SA_PRIVATE_KEY (or GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_APPLICATION_CREDENTIALS)'].filter(Boolean),
      docs: 'docs/CREDENTIALS-AND-ACCESS.md',
    });
    return;
  }
  if (!start || !end) {
    res.status(400).json({ error: 'start and end (YYYY-MM-DD) query params are required' });
    return;
  }

  let BetaAnalyticsDataClient;
  try {
    ({ BetaAnalyticsDataClient } = require('@google-analytics/data'));
  } catch (e) {
    res.status(501).json({ error: "Dependency missing: run 'npm install @google-analytics/data'", detail: String(e) });
    return;
  }

  try {
    const client = new BetaAnalyticsDataClient(creds);
    const [report] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'keyEvents' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'landingPagePlusQueryString',
          stringFilter: { matchType: 'BEGINS_WITH', value: LANDING_PAGE_PATH },
        },
      },
    });

    const channels = [];
    for (const row of report.rows || []) {
      const group = row.dimensionValues[0].value;
      const channel = CHANNEL_MAP[group];
      if (!channel) continue; // only the four tracked channels
      const sessions = Number(row.metricValues[0].value) || 0;
      const keyEvents = Number(row.metricValues[1].value) || 0;
      const bounce = Number(row.metricValues[2].value) || 0;
      const engSec = Number(row.metricValues[3].value) || 0;
      channels.push({
        channel,
        sessions,
        keyEvents,
        convRate: sessions ? (keyEvents / sessions * 100).toFixed(2) + '%' : '0%',
        bounceRate: (bounce * 100).toFixed(1) + '%',
        engagement: engSec >= 60 ? Math.round(engSec) + ' sec' : engSec.toFixed(1) + ' sec',
      });
    }

    res.status(200).json({
      page: LANDING_PAGE_PATH,
      propertyId,
      periodLabel: `${start} – ${end}`,
      source: 'ga4-live',
      channels,
    });
  } catch (err) {
    // Mirror real failures honestly (auth, permissions, quota) — dashboard keeps placeholders.
    res.status(500).json({ error: 'GA4 request failed', detail: String(err && err.message || err) });
  }
};
