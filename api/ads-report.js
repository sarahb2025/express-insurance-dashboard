/**
 * Google Ads live feed — KPI band, stat cards & campaign table.
 * Route: GET /api/ads-report?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * SOURCE OF TRUTH for conversions, conversion value and ROAS.
 * Returns JSON consumed by tryLiveAds() in index.html:
 *   { periodLabel, compareLabel, kpi, stats, campaigns:[{key,cost,conv,cpa,convValue,roas}] }
 *
 * If unconfigured -> 501; if the API call fails -> 500 (both keep the dashboard's
 * static/placeholder figures — nothing is fabricated). See docs/INTEGRATIONS.md.
 */
const { getCustomer, campaignKeyFor, sendError, CAMPAIGN_NAMES } = require('../lib/google-ads');

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
    const rows = await customer.query(`
      SELECT campaign.name, campaign.status,
             metrics.cost_micros, metrics.impressions, metrics.clicks,
             metrics.conversions, metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${start}' AND '${end}'
    `);

    let imp = 0, clk = 0, cost = 0, conv = 0, val = 0;
    let brandCost = 0, brandVal = 0, pmaxRoas = 0, best = null;
    const byKey = {};
    const namesReturned = [], unmappedNames = [];
    for (const r of rows) {
      const cname = r.campaign && r.campaign.name;
      if (namesReturned.indexOf(cname) === -1) namesReturned.push(cname);
      const key = campaignKeyFor(r.campaign.name);
      if (!key) { if (unmappedNames.indexOf(cname) === -1) unmappedNames.push(cname); continue; }
      const c = (Number(r.metrics.cost_micros) || 0) / 1e6;
      const cv = Number(r.metrics.conversions) || 0;
      const vv = Number(r.metrics.conversions_value) || 0;
      imp += Number(r.metrics.impressions) || 0;
      clk += Number(r.metrics.clicks) || 0;
      cost += c; conv += cv; val += vv;
      const agg = byKey[key] || (byKey[key] = { key, cost: 0, conv: 0, convValue: 0 });
      agg.cost += c; agg.conv += cv; agg.convValue += vv;
      if (key === 'brand') { brandCost += c; brandVal += vv; }
    }

    const campaigns = Object.values(byKey).map((a) => {
      const roas = a.cost ? a.convValue / a.cost : 0;
      if (a.key === 'pmax') pmaxRoas = roas;
      if (a.key !== 'brand' && (!best || roas > best.roas)) best = { name: CAMPAIGN_NAMES[a.key] || a.key, roas };
      return { key: a.key, cost: Math.round(a.cost), conv: a.conv, cpa: a.conv ? Math.round(a.cost / a.conv) : 0, convValue: Math.round(a.convValue), roas };
    });

    const cpc = clk ? cost / clk : 0;
    // NOTE: period-over-period % change requires a second query for the previous window.
    // Left null here so the front end shows values without a fabricated delta; wire the
    // comparison query before publishing deltas. See docs/INTEGRATIONS.md.
    const mk = (v) => ({ v, chg: null });

    const payload = {
      periodLabel: `${start} – ${end}`,
      compareLabel: 'previous period',
      source: 'google-ads-live',
      kpi: {
        accountRoas: cost ? val / cost : 0,
        nonBrand: (cost - brandCost) ? (val - brandVal) / (cost - brandCost) : 0,
        bestName: best ? best.name : '', bestRoas: best ? best.roas : 0,
        pmaxRoas, convValue: Math.round(val), convValueNote: `${start} – ${end}`,
      },
      stats: {
        impressions: mk(imp), clicks: mk(clk), conversions: mk(conv),
        convValue: mk(val), cost: mk(cost), cpc: mk(cpc),
      },
      campaigns,
    };

    // Safe diagnostics (?debug=1): report data only — the query window, how many rows
    // Google Ads returned for that window, the campaign names returned, which mapped to a
    // dashboard key and which did not, and the account totals. No credentials are exposed.
    if (debug) {
      payload._debug = {
        window: { start, end },
        rowCount: rows.length,
        campaignNamesReturned: namesReturned,
        mappedKeys: campaigns.map((c) => c.key),
        unmappedNames,
        totals: { cost: Math.round(cost), conv, convValue: Math.round(val) },
      };
    }

    res.status(200).json(payload);
  } catch (err) {
    sendError(res, err);
  }
};
