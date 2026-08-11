/**
 * Render smoke-test: loads the master and the July report in the pre-installed
 * Chromium and checks for JS errors + that key content renders.
 *
 *   npm install --no-save playwright-core
 *   node scripts/render-check.mjs
 *
 * Starts nothing itself — run a static server first:  npm start   (port 8099)
 * The client-side password gate is bypassed for the test via sessionStorage.
 */
import { chromium } from 'playwright-core';
import fs from 'fs';

function findChrome() {
  const base = '/opt/pw-browsers';
  for (const d of fs.readdirSync(base)) {
    if (d.startsWith('chromium') && !d.includes('headless')) {
      const p = `${base}/${d}/chrome-linux/chrome`;
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error('Chromium not found under /opt/pw-browsers');
}

const BASE = process.env.BASE || 'http://localhost:8099';
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox'] });
let failures = 0;

async function check(path, label, assertions) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { try { sessionStorage.setItem('ei_ok', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push('PAGEERROR: ' + e.message));
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(600);
  const gateGone = (await page.$('#pw-gate')) === null;
  const res = await assertions(page);
  await ctx.close();
  const ok = gateGone && jsErrors.length === 0 && res.ok;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${JSON.stringify({ gateGone, jsErrors, ...res })}`);
}

await check('/index.html', 'MASTER renders reference data', async (p) => {
  const camp = await p.$$eval('#perf table tbody tr', (r) => r.length);
  const stat = (await p.textContent('#perf .stats-row .stat-card:first-child .stat-val'))?.trim();
  return { ok: camp === 7 && !!stat && stat !== '—', campRows: camp, firstStat: stat };
});

await check('/reports/2026-07/index.html', 'JULY report renders placeholders', async (p) => {
  const kpi = (await p.textContent('.kpi-bar .kpi-item:nth-child(2) .kpi-val'))?.trim();
  const stat = (await p.textContent('#perf .stats-row .stat-card:first-child .stat-val'))?.trim();
  const banner = (await p.textContent('#tpl-banner'))?.includes('Reporting month');
  return { ok: kpi === '—' && stat === '—' && banner, kpi, stat, banner };
});

await browser.close();
console.log(failures === 0 ? '\nAll render checks passed.' : `\n${failures} render check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
