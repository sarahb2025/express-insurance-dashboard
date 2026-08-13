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

// GA4 runReport row shape: dimension [channelGroup],
// metrics [sessions, keyEvents, sessionKeyEventRate(0..1), bounceRate(0..1), averageSessionDuration(sec)]
const row = (group, s, ke, keRate, bounce, eng) => ({
  dimensionValues: [{ value: group }],
  metricValues: [{ value: String(s) }, { value: String(ke) }, { value: String(keRate) }, { value: String(bounce) }, { value: String(eng) }],
});

// 1) Exact GA4 channel-group names (values mirror Omdigi's July report)
const out = mapChannels([
  row('Cross-network', 60, 1, 0.0167, 0.65, 47),
  row('Paid Search', 100, 71, 0.25, 0.25, 129),
  row('Direct', 12, 3, 0.1667, 0.3333, 86),
  row('Organic Search', 3, 8, 0.6667, 0, 490),
]);
eq('maps all four channels', out.length, 4);
const by = Object.fromEntries(out.map((c) => [c.channel, c]));
ok('has crossnet/paidsearch/direct/organic', by.crossnet && by.paidsearch && by.direct && by.organic);
eq('paidsearch sessions', by.paidsearch.sessions, 100);
eq('paidsearch keyEvents', by.paidsearch.keyEvents, 71);
eq('paidsearch convRate = session key event rate (25%), not keyEvents/sessions', by.paidsearch.convRate, '25.00%');
eq('paidsearch bounceRate', by.paidsearch.bounceRate, '25.0%');
eq('paidsearch engagement (>=60s rounded)', by.paidsearch.engagement, '129 sec');
eq('crossnet convRate uses the GA4 rate (1.67%)', by.crossnet.convRate, '1.67%');
eq('crossnet engagement (<60s, one decimal)', by.crossnet.engagement, '47.0 sec');

// 2) Tolerant matching — casing / hyphen / spacing variants still map
const variants = mapChannels([
  row('cross-network', 10, 1, 0.1, 0.5, 30),
  row('PAID SEARCH', 10, 1, 0.1, 0.5, 30),
  row('organic search', 10, 1, 0.1, 0.5, 30),
  row('Direct', 10, 1, 0.1, 0.5, 30),
]);
eq('variants all map', variants.length, 4);
ok('variant channels correct', ['crossnet', 'paidsearch', 'direct', 'organic'].every((k) => variants.some((c) => c.channel === k)));

// 3) Unmapped channel groups are skipped (not blanked/errored)
const mixed = mapChannels([row('Referral', 5, 0, 0, 0.9, 2), row('Email', 3, 0, 0, 0.9, 2), row('Direct', 7, 1, 0.14, 0.1, 20)]);
eq('only mapped channels kept', mixed.length, 1);
eq('kept channel is direct', mixed[0].channel, 'direct');

// 4) Robustness
eq('empty rows -> []', mapChannels([]).length, 0);
eq('undefined rows -> []', mapChannels(undefined).length, 0);
const guard = mapChannels([{ dimensionValues: [{ value: 'Direct' }] }]); // no metricValues
eq('missing metrics -> sessions 0', guard[0].sessions, 0);
eq('missing metrics -> 0.00% convRate', guard[0].convRate, '0.00%');

console.log(`ga4 channel mapping: ${passed} assertions passed`);
