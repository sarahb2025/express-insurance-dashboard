/**
 * Offline unit test for api/ads-asset-groups.js → aggregateAssetGroups().
 * No Google Ads credentials or network needed — validates the pure mapping/math.
 *
 *   node scripts/test-asset-groups.js
 */
const assert = require('assert');
const { aggregateAssetGroups } = require('../api/ads-asset-groups.js');

let passed = 0;
function ok(name, cond) { assert.ok(cond, name); passed++; }

// Mock google-ads-api rows (cost in micros); two rows for "General" to test aggregation.
const rows = [
  { asset_group: { name: 'General' },     metrics: { cost_micros: 12528e6, conversions: 30, conversions_value: 24000 } },
  { asset_group: { name: 'General' },     metrics: { cost_micros: 500e6,   conversions: 5,  conversions_value: 1000 } },
  { asset_group: { name: 'Accountants' }, metrics: { cost_micros: 4420e6,  conversions: 10, conversions_value: 3840 } },
  { asset_group: { name: 'ZeroSpend' },   metrics: { cost_micros: 0,       conversions: 0,  conversions_value: 0 } },
];

const out = aggregateAssetGroups(rows);

ok('collapses to 3 groups', out.length === 3);
ok('sorted by conv value desc', out[0].name === 'General' && out[1].name === 'Accountants' && out[2].name === 'ZeroSpend');

const g = out[0];
ok('General spend summed', g.spend === 13028);          // 12528 + 500
ok('General conversions summed', g.conv === 35);        // 30 + 5
ok('General conv value summed', g.convValue === 25000); // 24000 + 1000
ok('General ROAS = value/spend', g.roas === 1.92);      // 25000/13028 = 1.9189 -> 1.92

const a = out[1];
ok('Accountants ROAS rounded', a.roas === 0.87);        // 3840/4420 = 0.8688 -> 0.87

const z = out[2];
ok('Zero spend => ROAS 0 (no divide-by-zero)', z.roas === 0 && z.spend === 0);

// robustness
ok('empty input => []', Array.isArray(aggregateAssetGroups([])) && aggregateAssetGroups([]).length === 0);
ok('undefined input => []', aggregateAssetGroups(undefined).length === 0);
ok('missing metrics tolerated', aggregateAssetGroups([{ asset_group: { name: 'X' } }])[0].spend === 0);
ok('missing asset_group => "Unnamed"', aggregateAssetGroups([{ metrics: { cost_micros: 1e6, conversions: 1, conversions_value: 2 } }])[0].name === 'Unnamed');

console.log(`asset-group aggregation: ${passed} assertions passed`);
