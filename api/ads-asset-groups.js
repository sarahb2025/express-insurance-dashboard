/**
 * Google Ads live feed — PERFORMANCE MAX ASSET GROUPS.
 * Route: GET /api/ads-asset-groups?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * SOURCE OF TRUTH: Google Ads. Powers the "Performance Max & Asset Group
 * Overview" table (Spend, Conversions, Conv. Value, ROAS per asset group).
 *
 * Returns JSON consumed by tryLiveAssetGroups() → renderAssetGroups() in
 * index.html:
 *   { periodLabel, source, assetGroups:[ { name, spend, conv, convValue, roas } ] }
 *
 * Same credentials as the other Google Ads feeds (see lib/google-ads.js /
 * docs/CREDENTIALS-AND-ACCESS.md) — no new env var. If unconfigured -> 501; on
 * API failure -> 500. Both keep the dashboard's placeholder row; nothing is
 * fabricated.
 */
const { getCustomer, sendError } = require('../lib/google-ads');

/**
 * Pure aggregation of raw Google Ads asset_group rows into the table shape.
 * Exported for offline unit testing (no API/credentials needed).
 * @param {Array} rows google-ads-api rows: { asset_group:{name}, metrics:{cost_micros,conversions,conversions_value} }
 * @returns {Array} [{ name, spend, conv, convValue, roas }] sorted by conversion value desc
 */
function aggregateAssetGroups(rows) {
  const byName = {};
  for (const r of rows || []) {
    const name = (r.asset_group && r.asset_group.name) || 'Unnamed';
    const cost = (Number(r.metrics && r.metrics.cost_micros) || 0) / 1e6;
    const conv = Number(r.metrics && r.metrics.conversions) || 0;
    const val = Number(r.metrics && r.metrics.conversions_value) || 0;
    const a = byName[name] || (byName[name] = { name, spend: 0, conv: 0, convValue: 0 });
    a.spend += cost; a.conv += conv; a.convValue += val;
  }
  return Object.values(byName)
    .map((a) => ({
      name: a.name,
      spend: Math.round(a.spend),
      conv: Math.round(a.conv * 100) / 100,
      convValue: Math.round(a.convValue),
      roas: a.spend ? Math.round((a.convValue / a.spend) * 100) / 100 : 0,
    }))
    .sort((x, y) => y.convValue - x.convValue);
}

async function handler(req, res) {
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
    const rows = await customer.query(`
      SELECT asset_group.name, campaign.name,
             metrics.cost_micros, metrics.conversions, metrics.conversions_value
      FROM asset_group
      WHERE segments.date BETWEEN '${start}' AND '${end}'
        AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
    `);
    const assetGroups = aggregateAssetGroups(rows);
    const payload = {
      periodLabel: `${start} – ${end}`,
      source: 'google-ads-live',
      assetGroups,
    };
    // Safe diagnostics (?debug=1): report data only — the window, the PMax asset-group row
    // count, and the asset-group / campaign names returned. No credentials exposed.
    if (debug) {
      const groupNames = [], campaignNames = [];
      for (const r of rows || []) {
        const gn = r.asset_group && r.asset_group.name;
        const cn = r.campaign && r.campaign.name;
        if (gn && groupNames.indexOf(gn) === -1) groupNames.push(gn);
        if (cn && campaignNames.indexOf(cn) === -1) campaignNames.push(cn);
      }
      payload._debug = {
        window: { start, end },
        rowCount: (rows || []).length,
        assetGroupNames: groupNames,
        pmaxCampaignNames: campaignNames,
      };
    }
    res.status(200).json(payload);
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = handler;
module.exports.aggregateAssetGroups = aggregateAssetGroups;
