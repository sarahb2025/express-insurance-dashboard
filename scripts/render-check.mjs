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
  const budget = await p.$$eval('#budget-rows .brow', (r) => r.length);
  const pmaxTitle = (await p.textContent('#pmax .sec-title'))?.trim();
  // active campaigns only (paused hidden); data-driven budget rows; renamed PMax
  const ok = camp === 5 && !!stat && stat !== '—' && budget === 6 && pmaxTitle === 'Performance Max & Asset Group Overview';
  return { ok, campRows: camp, firstStat: stat, budgetRows: budget, pmaxTitle };
});

await check('/reports/2026-07/index.html', 'JULY report renders placeholders', async (p) => {
  const kpi = (await p.textContent('.kpi-bar .kpi-item:nth-child(2) .kpi-val'))?.trim();
  const stat = (await p.textContent('#perf .stats-row .stat-card:first-child .stat-val'))?.trim();
  const banner = (await p.textContent('#tpl-banner'))?.includes('Reporting month');
  const budgetKpi = (await p.textContent('.kpi-bar .kpi-item:nth-child(1) .kpi-val'))?.trim();
  const bannerNoPlaceholderClaim = !(await p.textContent('#tpl-banner'))?.includes('all live figures are placeholders');
  const bodyText = await p.textContent('body');
  const noStrayBackref = !bodyText.includes('\\1'); // the old regex artifact must be gone
  // Landing Page section must be a sibling of Geography, not nested inside it
  const lpNotNestedInGeo = await p.evaluate(() => {
    const lp = document.getElementById('lp-grid');
    return lp ? !lp.closest('#insight-state-bars') : true;
  });
  return {
    ok: kpi === '—' && stat === '—' && banner && budgetKpi === '$18K' && bannerNoPlaceholderClaim && noStrayBackref && lpNotNestedInGeo,
    kpi, stat, banner, budgetKpi, bannerNoPlaceholderClaim, noStrayBackref, lpNotNestedInGeo,
  };
});

await check('/reports/2026-07/index.html', 'JULY live-render display fixes', async (p) => {
  // Simulate a live Google Ads feed response and exercise the render path
  const r = await p.evaluate(() => {
    renderKPI({ accountRoas: 2.1, nonBrand: 1.8, bestName: 'pl', bestRoas: 2.4, pmaxRoas: 1.9, convValue: 90000, convValueNote: '1 – 31 July 2026' });
    renderStats({ impressions: { v: 436000, chg: null }, clicks: { v: 12780, chg: null }, conversions: { v: 60, chg: null }, convValue: { v: 90000, chg: null }, cost: { v: 18000, chg: null }, cpc: { v: 1.4, chg: null } });
    const item = (n) => document.querySelector(`.kpi-bar .kpi-item:nth-child(${n})`);
    const firstBadge = document.querySelector('#perf .stats-row .stat-card:first-child .stat-chg')?.textContent.trim();
    return {
      monthlyBudget: item(1).querySelector('.kpi-val').textContent.trim(),
      bestCampaign: item(3).querySelector('.kpi-val').textContent.trim(),
      pmaxNote: item(4).querySelector('.kpi-chg').textContent.trim(),
      firstStatBadge: firstBadge,
      geoChgNew: geoChg(3, 0),
      geoChgReal: geoChg(6, 5),
    };
  });
  const ok =
    r.monthlyBudget === '$18K' &&
    r.bestCampaign === 'Public Liability' &&          // key 'pl' mapped to full name
    r.pmaxNote === 'Optimising — new groups in progress' &&  // no "Awaiting Google Ads"
    r.firstStatBadge === 'vs prev n/a' &&             // null chg labelled, not +0%
    !r.firstStatBadge.includes('+0%') &&
    r.geoChgNew === 'new' && /%$/.test(r.geoChgReal);
  return { ok, ...r };
});

await check('/reports/2026-07/index.html', 'JULY landing-page cards fill from a live GA4 response', async (p) => {
  const r = await p.evaluate(() => {
    renderLandingPage([
      { channel: 'crossnet', sessions: 1928, keyEvents: 14, convRate: '0.73%', bounceRate: '85.6%', engagement: '0:47' },
      { channel: 'paidsearch', sessions: 160, keyEvents: 31, convRate: '19.4%', bounceRate: '32.2%', engagement: '2:09' },
      { channel: 'direct', sessions: 84, keyEvents: 6, convRate: '7.1%', bounceRate: '15.5%', engagement: '1:26' },
      { channel: 'organic', sessions: 28, keyEvents: 3, convRate: '10.7%', bounceRate: '60.7%', engagement: '8:10' },
    ]);
    const read = (ch) => {
      const card = document.querySelector(`#lp-grid .lp-card[data-channel="${ch}"]`);
      const strongs = card.querySelectorAll('div[style*="flex-direction:column"] strong');
      return { sessions: card.querySelector('.lp-metric').textContent.trim(), keyEvents: strongs[0].textContent.trim() };
    };
    return { crossnet: read('crossnet'), paidsearch: read('paidsearch'), direct: read('direct'), organic: read('organic') };
  });
  const filled = ['crossnet', 'paidsearch', 'direct', 'organic'].every((c) => r[c].sessions !== '—' && r[c].keyEvents !== '—');
  return { ok: filled && r.paidsearch.sessions === '160', ...r };
});

// AUGUST report — same placeholder posture as July, plus the confirmed $18K budget,
// the August reporting period, and the manual budget note rendered from data.budgetNote.
await check('/reports/2026-08/index.html', 'AUGUST report renders placeholders + $18K + Aug period + budget note', async (p) => {
  const kpi = (await p.textContent('.kpi-bar .kpi-item:nth-child(2) .kpi-val'))?.trim();
  const stat = (await p.textContent('#perf .stats-row .stat-card:first-child .stat-val'))?.trim();
  const banner = (await p.textContent('#tpl-banner'))?.includes('Reporting month');
  const budgetKpi = (await p.textContent('.kpi-bar .kpi-item:nth-child(1) .kpi-val'))?.trim();
  const bannerNoPlaceholderClaim = !(await p.textContent('#tpl-banner'))?.includes('all live figures are placeholders');
  const noStrayBackref = !(await p.textContent('body')).includes('\\1');
  // Budget note visible with the confirmed August wording, labelled Manual
  const noteBox = await p.$('#budget-note-manual');
  const noteVisible = noteBox ? await noteBox.isVisible() : false;
  const noteText = (await p.textContent('#budget-note-manual-text'))?.trim() || '';
  const noteHasChip = await p.$eval('#budget-note-manual .src-manual', (e) => e.textContent.trim().toLowerCase() === 'manual').catch(() => false);
  // August reporting period is reflected in the performance header
  const periodAug = (await p.textContent('body')).includes('August 2026');
  return {
    ok: kpi === '—' && stat === '—' && banner && budgetKpi === '$18K' && bannerNoPlaceholderClaim && noStrayBackref &&
        noteVisible && noteHasChip && periodAug &&
        noteText.startsWith('The $18,000 monthly budget and campaign split remained unchanged in August'),
    kpi, stat, banner, budgetKpi, noteVisible, noteHasChip, periodAug, noteText: noteText.slice(0, 40),
  };
});

// July's budget note element must stay hidden (July supplies no data.budgetNote) — proves the
// additive master change did not alter the July report's rendered output.
await check('/reports/2026-07/index.html', 'JULY budget note stays hidden (unchanged behaviour)', async (p) => {
  const box = await p.$('#budget-note-manual');
  const hidden = box ? !(await box.isVisible()) : true;
  return { ok: hidden, hidden };
});

// No client-facing "Kirsten" anywhere in the rendered dashboard (text, tooltips/title
// attributes, class names). Checks the fully-rendered DOM case-insensitively on both the
// master template and the July report. Fails the suite if the name reappears.
async function checkNoKirsten(path, label) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { try { sessionStorage.setItem('ei_ok', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(600);
  const hits = await page.evaluate(() => {
    const html = document.documentElement.outerHTML.toLowerCase();
    let n = 0, i = -1;
    while ((i = html.indexOf('kirsten', i + 1)) !== -1) n++;
    return n;
  });
  await ctx.close();
  const ok = hits === 0;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${JSON.stringify({ kirstenOccurrences: hits })}`);
}

await checkNoKirsten('/index.html', 'MASTER contains no "Kirsten" reference');
await checkNoKirsten('/reports/2026-07/index.html', 'JULY contains no "Kirsten" reference');
await checkNoKirsten('/reports/2026-08/index.html', 'AUGUST contains no "Kirsten" reference');

await browser.close();
console.log(failures === 0 ? '\nAll render checks passed.' : `\n${failures} render check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
