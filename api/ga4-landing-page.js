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

// Landing page to report on. Overridable without a code change if the path differs
// in GA4 (e.g. a trailing slash or a different URL structure).
const LANDING_PAGE_PATH = process.env.GA4_LANDING_PAGE_PATH || '/professional-indemnity-insurance/accountants-insurance';

// Channel-group dimension. Omdigi's GA4 report uses "Session primary channel group"
// (sessionPrimaryChannelGroup); the Data API default here is sessionDefaultChannelGroup.
// Override to match the exact report once the property is confirmed.
const CHANNEL_DIMENSION = process.env.GA4_CHANNEL_DIMENSION || 'sessionDefaultChannelGroup';

// GA4 default channel group -> the four dashboard cards. Matching is tolerant of
// case, hyphens and spacing so small naming differences don't drop rows.
const CHANNEL_ALIASES = {
  crossnetwork: 'crossnet',
  paidsearch: 'paidsearch',
  direct: 'direct',
  organicsearch: 'organic',
};
function normChannel(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s\-_/]+/g, ''); }

// Pure mapping of GA4 report rows -> the dashboard's channel cards. Exported for
// offline testing. Rows are the runReport rows with the channel-group dimension and
// metrics [sessions, keyEvents, sessionKeyEventRate, bounceRate, averageSessionDuration]
// in that order. Conv. Rate uses GA4's Session key event rate (% of sessions with a
// key event) to match the GA4 report — NOT keyEvents/sessions.
function mapChannels(rows) {
  const out = [];
  const seen = {};
  for (const row of rows || []) {
    const dv = row.dimensionValues || [];
    const group = dv[0] ? dv[0].value : '';
    const channel = CHANNEL_ALIASES[normChannel(group)];
    if (!channel || seen[channel]) continue; // only the four tracked channels; first row wins
    seen[channel] = true;
    const mv = row.metricValues || [];
    const num = (i) => Number(mv[i] && mv[i].value) || 0;
    const sessions = num(0), keyEvents = num(1), keyEventRate = num(2), bounce = num(3), engSec = num(4);
    out.push({
      channel,
      sessions,
      keyEvents,
      convRate: (keyEventRate * 100).toFixed(2) + '%', // GA4 "Session key event rate"
      bounceRate: (bounce * 100).toFixed(1) + '%',
      engagement: engSec >= 60 ? Math.round(engSec) + ' sec' : engSec.toFixed(1) + ' sec',
    });
  }
  return out;
}

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
      dimensions: [{ name: CHANNEL_DIMENSION }],
      metrics: [
        { name: 'sessions' },
        { name: 'keyEvents' },
        { name: 'sessionKeyEventRate' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'landingPagePlusQueryString',
          // caseSensitive:false — GA4 string filters default to case-sensitive, a common
          // cause of zero rows when the stored path casing differs.
          stringFilter: { matchType: 'BEGINS_WITH', value: LANDING_PAGE_PATH, caseSensitive: false },
        },
      },
    });

    const rows = report.rows || [];
    const channels = mapChannels(rows);

    const payload = {
      page: LANDING_PAGE_PATH,
      propertyId,
      periodLabel: `${start} – ${end}`,
      source: 'ga4-live',
      channels,
    };

    // Safe diagnostics (?debug=1): report data only — the landing-page filter used,
    // the row count, and the raw GA4 channel-group names (mapped + unmapped). No credentials.
    if (req.query && (req.query.debug === '1' || req.query.debug === 'true')) {
      const groups = rows.map((r) => (r.dimensionValues && r.dimensionValues[0] ? r.dimensionValues[0].value : null));
      // Also fetch the actual top landing pages (unfiltered) so the correct path is
      // visible in one call — report data only (page paths + session counts).
      let topLandingPages;
      try {
        const [lp] = await client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'landingPagePlusQueryString' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 15,
        });
        topLandingPages = (lp.rows || []).map((r) => ({
          path: r.dimensionValues[0].value,
          sessions: Number(r.metricValues[0].value) || 0,
        }));
      } catch (e) {
        topLandingPages = { error: String(e && e.message || e) };
      }
      payload._debug = {
        landingPagePath: LANDING_PAGE_PATH,
        rowCount: rows.length,
        channelGroupsReturned: groups,
        mappedChannels: channels.map((c) => c.channel),
        unmappedGroups: groups.filter((g) => !CHANNEL_ALIASES[normChannel(g)]),
        topLandingPages,
      };
    }

    res.status(200).json(payload);
  } catch (err) {
    // Mirror real failures honestly (auth, permissions, quota) — dashboard keeps placeholders.
    res.status(500).json({ error: 'GA4 request failed', detail: String(err && err.message || err) });
  }
};

// Exported for offline unit testing (no network/credentials).
module.exports.mapChannels = mapChannels;
