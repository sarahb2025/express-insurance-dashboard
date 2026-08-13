/**
 * Offline unit test for api/ga4-landing-page.js -> mapChannels().
 * Verifies GA4 report rows map to the four dashboard cards, tolerant of channel-name
 * casing/hyphen/spacing, with correctly computed/formatted fields. No network/creds.
 *
 *   node scripts/test-ga4-channels.js
 */
const assert = require('assert');
const { mapChannels } = require('../api/ga4-landing-page.js');

let passed = 0;
function ok(name, cond) { assert.ok(cond, name); passed++; }
function eq(name, a, b) { assert.strictEqual(a, b, name); passed++; }

// GA4 runReport row shape: dimension [sessionDefaultChannelGroup],
// metrics [sessions, keyEvents, bounceRate(0..1), averageSessionDuration(sec)]
const row = (group, s, ke, bounce, eng) => ({
  dimensionValues: [{ value: group }],
  metricValues: [{ value: String(s) }, { value: String(ke) }, { value: String(bounce) }, { value: String(eng) }],
});

// 1) Exact GA4 channel-group names
const out = mapChannels([
  row('Cross-network', 1928, 14, 0.856, 5.6),
  row('Paid Search', 59, 31, 0.322, 78),
  row('Direct', 84, 6, 0.155, 8.9),
  row('Organic Search', 28, 3, 0.607, 8.1),
]);
eq('maps all four channels', out.length, 4);
const by = Object.fromEntries(out.map((c) => [c.channel, c]));
ok('has crossnet/paidsearch/direct/organic', by.crossnet && by.paidsearch && by.direct && by.organic);
eq('crossnet sessions', by.crossnet.sessions, 1928);
eq('crossnet keyEvents', by.crossnet.keyEvents, 14);
eq('crossnet convRate', by.crossnet.convRate, '0.73%');   // 14/1928*100
eq('crossnet bounceRate', by.crossnet.bounceRate, '85.6%');
eq('crossnet engagement (<60s)', by.crossnet.engagement, '5.6 sec');
eq('paidsearch engagement (>=60s rounded)', by.paidsearch.engagement, '78 sec');
eq('paidsearch convRate', by.paidsearch.convRate, '52.54%');

// 2) Tolerant matching — casing / hyphen / spacing variants still map
const variants = mapChannels([
  row('cross-network', 10, 1, 0.5, 30),
  row('PAID SEARCH', 10, 1, 0.5, 30),
  row('organic search', 10, 1, 0.5, 30),
  row('Direct', 10, 1, 0.5, 30),
]);
eq('variants all map', variants.length, 4);
ok('variant channels correct', ['crossnet', 'paidsearch', 'direct', 'organic'].every((k) => variants.some((c) => c.channel === k)));

// 3) Unmapped channel groups are skipped (not blanked/errored)
const mixed = mapChannels([row('Referral', 5, 0, 0.9, 2), row('Email', 3, 0, 0.9, 2), row('Direct', 7, 1, 0.1, 20)]);
eq('only mapped channels kept', mixed.length, 1);
eq('kept channel is direct', mixed[0].channel, 'direct');

// 4) Robustness
eq('empty rows -> []', mapChannels([]).length, 0);
eq('undefined rows -> []', mapChannels(undefined).length, 0);
const guard = mapChannels([{ dimensionValues: [{ value: 'Direct' }] }]); // no metricValues
eq('missing metrics -> sessions 0', guard[0].sessions, 0);
eq('zero sessions -> 0% convRate', guard[0].convRate, '0%');

console.log(`ga4 channel mapping: ${passed} assertions passed`);
