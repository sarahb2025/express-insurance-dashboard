/**
 * Offline checks for the Google Ads integration after the API-version bump.
 *  1. Interface compatibility: the installed google-ads-api still exposes
 *     GoogleAdsApi + Customer().query (skips gracefully if the dep isn't installed).
 *  2. Query/resource validity: each endpoint targets the expected GAQL resource and
 *     the metric fields the dashboard needs (static source scan — no API call).
 *
 * No network, no credentials.  node scripts/test-ads-queries.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
function ok(name, cond) { assert.ok(cond, name); passed++; }

// 1) Interface compatibility (skip if google-ads-api not installed in this env)
let gaa = null;
try { gaa = require('google-ads-api'); } catch (_) { /* not installed here */ }
if (gaa) {
  ok('exports GoogleAdsApi', typeof gaa.GoogleAdsApi === 'function');
  const client = new gaa.GoogleAdsApi({ client_id: 'x', client_secret: 'y', developer_token: 'z' });
  ok('client.Customer is a function', typeof client.Customer === 'function');
  const cust = client.Customer({ customer_id: '1234567890', refresh_token: 'r' });
  ok('customer.query is a function', typeof cust.query === 'function');
  console.log('  interface: google-ads-api present, GoogleAdsApi/Customer/query OK');
} else {
  console.log('  interface: google-ads-api not installed here — interface check skipped (Vercel installs it)');
}

// 2) Query/resource validity — the endpoints must target these resources + fields.
function src(f) { return fs.readFileSync(path.join(__dirname, '..', 'api', f), 'utf8'); }
const report = src('ads-report.js');
const geo = src('ads-geo.js');
const ag = src('ads-asset-groups.js');

// ads-report: campaign performance
ok('ads-report FROM campaign', /FROM\s+campaign/.test(report));
['metrics.cost_micros', 'metrics.impressions', 'metrics.clicks', 'metrics.conversions', 'metrics.conversions_value']
  .forEach((f) => ok(`ads-report selects ${f}`, report.includes(f)));

// ads-geo: geographic_view + geo_target_constant resolution
ok('ads-geo FROM geographic_view', /FROM\s+geographic_view/.test(geo));
ok('ads-geo FROM geo_target_constant', /FROM\s+geo_target_constant/.test(geo));
['segments.geo_target_city', 'metrics.conversions'].forEach((f) => ok(`ads-geo selects ${f}`, geo.includes(f)));

// ads-asset-groups: asset_group filtered to Performance Max
ok('ads-asset-groups FROM asset_group', /FROM\s+asset_group/.test(ag));
ok('ads-asset-groups filters PERFORMANCE_MAX', ag.includes("advertising_channel_type = 'PERFORMANCE_MAX'"));
['metrics.cost_micros', 'metrics.conversions', 'metrics.conversions_value']
  .forEach((f) => ok(`ads-asset-groups selects ${f}`, ag.includes(f)));

// 3) Best-campaign name mapping: API must return a full name, not the internal key.
const lib = require('../lib/google-ads.js');
ok('lib exports CAMPAIGN_NAMES', lib.CAMPAIGN_NAMES && typeof lib.CAMPAIGN_NAMES === 'object');
ok('CAMPAIGN_NAMES.pl = Public Liability', lib.CAMPAIGN_NAMES.pl === 'Public Liability');
ok('ads-report maps best campaign key via CAMPAIGN_NAMES', report.includes('CAMPAIGN_NAMES[a.key]'));

console.log(`ads query/resource checks: ${passed} assertions passed`);
