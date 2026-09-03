/**
 * Google Ads live feed — GEOGRAPHY (conversions by location).
 * Route: GET /api/ads-geo?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * SOURCE OF TRUTH for geographic reporting. This intentionally replaces the
 * previous GA4-based geo feed: geography must come from Google Ads, not GA4.
 *
 * Returns JSON consumed by renderGeo() via tryLiveAdsGeo() in index.html:
 *   { periodLabel, locations:[ { name, tableName, state, conv, prev } ] }
 *
 * Uses the geographic_view resource. geo_target_constant ids are resolved to
 * human-readable names/states. `conv` = conversions this period, `prev` =
 * conversions in the previous equal-length window (queried separately).
 *
 * If unconfigured -> 501; on failure -> 500 (dashboard keeps its placeholder geo).
 * See docs/INTEGRATIONS.md.
 */
const { getCustomer, sendError } = require('../lib/google-ads');

function shiftBack(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function convByLocation(customer, start, end) {
  // geographic_view exposes country_criterion_id / most specific location via
  // segments.geo_target_* — here we use geo_target_city for city-level conversions.
  const rows = await customer.query(`
    SELECT segments.geo_target_city, metrics.conversions
    FROM geographic_view
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND geographic_view.location_type = 'LOCATION_OF_PRESENCE'
  `);
  const map = {};
  for (const r of rows) {
    const loc = r.segments.geo_target_city || 'Unknown';
    map[loc] = (map[loc] || 0) + (Number(r.metrics.conversions) || 0);
  }
  return map; // { 'geoTargetConstants/1000286': 6.0, ... }  (resolve names below)
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { start, end } = req.query || {};
  if (!start || !end) {
    res.status(400).json({ error: 'start and end (YYYY-MM-DD) query params are required' });
    return;
  }
  const debug = req.query && (req.query.debug === '1' || req.query.debug === 'true');
  let customer;
  try { customer = getCustomer(); } catch (e) { return sendError(res, e); }

  try {
    const days = Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
    const prevEnd = shiftBack(start, 1);
    const prevStart = shiftBack(start, days);

    const [cur, prev] = await Promise.all([
      convByLocation(customer, start, end),
      convByLocation(customer, prevStart, prevEnd),
    ]);

    // Resolve geo_target_constant resource names -> { name, state }.
    const ids = Object.keys(cur).map((rn) => rn.split('/').pop()).filter(Boolean);
    const names = {};
    if (ids.length) {
      const gtc = await customer.query(`
        SELECT geo_target_constant.id, geo_target_constant.name, geo_target_constant.canonical_name
        FROM geo_target_constant
        WHERE geo_target_constant.id IN (${ids.join(',')})
      `);
      for (const g of gtc) {
        // canonical_name looks like "Brisbane City,Queensland,Australia"
        const parts = (g.geo_target_constant.canonical_name || '').split(',');
        names[g.geo_target_constant.id] = { name: g.geo_target_constant.name, state: parts[1] || '' };
      }
    }

    const locations = Object.entries(cur)
      .map(([rn, conv]) => {
        const id = rn.split('/').pop();
        const meta = names[id] || { name: id, state: '' };
        return { name: meta.name, tableName: meta.name, state: meta.state, conv, prev: prev[rn] || 0 };
      })
      .sort((a, b) => b.conv - a.conv)
      .slice(0, 10);

    const payload = {
      periodLabel: `All campaigns · ${start} – ${end} · User location (Google Ads)`,
      source: 'google-ads-live',
      locations,
    };
    // Safe diagnostics (?debug=1): report data only — the window, how many distinct
    // locations had conversions in the current and previous windows, and the resolved
    // top locations. No credentials exposed.
    if (debug) {
      payload._debug = {
        window: { start, end },
        prevWindow: { start: prevStart, end: prevEnd },
        currentLocationCount: Object.keys(cur).length,
        prevLocationCount: Object.keys(prev).length,
        resolvedTopLocations: locations.map((l) => ({ name: l.name, state: l.state, conv: l.conv })),
      };
    }
    res.status(200).json(payload);
  } catch (err) {
    sendError(res, err);
  }
};
