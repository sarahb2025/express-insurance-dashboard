/**
 * Unit test: Google Ads scalar env vars are trimmed of leading/trailing whitespace
 * (newlines/tabs/spaces) before use, so a stray newline can't produce
 * "Metadata string value contains illegal characters".
 *
 * Uses SYNTHETIC fixtures only — no real credentials. No values are printed except
 * these fake fixtures on an assertion failure.
 *
 *   node scripts/test-ads-env.js
 */
const assert = require('assert');
const { readAdsEnv, missingEnv } = require('../lib/google-ads.js');

const KEYS = [
  'GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID', 'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
];
const saved = {};
KEYS.forEach((k) => { saved[k] = process.env[k]; });
function restore() {
  KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
}

let passed = 0;
function ok(name, cond) { assert.ok(cond, name); passed++; }
function eq(name, a, b) { assert.strictEqual(a, b, name); passed++; }

try {
  // Fixtures deliberately wrapped in newlines/CR/tabs/spaces (the real-world failure mode)
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN = '\nDEV_TOKEN\n';
  process.env.GOOGLE_ADS_CLIENT_ID = '  client-id.apps.googleusercontent.com  ';
  process.env.GOOGLE_ADS_CLIENT_SECRET = '\tSECRET\r\n';
  process.env.GOOGLE_ADS_REFRESH_TOKEN = '\r\n1//refresh-token\n';
  process.env.GOOGLE_ADS_CUSTOMER_ID = ' 1234567890\n';
  process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = '\n9876543210 ';

  const cfg = readAdsEnv();
  eq('developer_token trimmed', cfg.developer_token, 'DEV_TOKEN');
  eq('client_id trimmed', cfg.client_id, 'client-id.apps.googleusercontent.com');
  eq('client_secret trimmed', cfg.client_secret, 'SECRET');
  eq('refresh_token trimmed', cfg.refresh_token, '1//refresh-token');
  eq('customer_id trimmed', cfg.customer_id, '1234567890');
  eq('login_customer_id trimmed', cfg.login_customer_id, '9876543210');

  // No control characters remain (the thing gRPC metadata rejects)
  Object.keys(cfg).forEach((k) => {
    const v = cfg[k];
    if (typeof v === 'string') {
      ok(`${k}: no CR/LF/tab`, !/[\r\n\t]/.test(v));
      ok(`${k}: no leading/trailing space`, v === v.trim());
    }
  });

  // Optional login id: absent => undefined (not empty string)
  delete process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  eq('absent login id => undefined', readAdsEnv().login_customer_id, undefined);

  // A whitespace-only required var is treated as MISSING
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN = '   \n  ';
  ok('whitespace-only dev token is missing', missingEnv().includes('GOOGLE_ADS_DEVELOPER_TOKEN'));

  console.log(`ads env normalization: ${passed} assertions passed`);
} finally {
  restore();
}
