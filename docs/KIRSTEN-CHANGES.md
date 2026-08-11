# Kirsten's changes & manual inputs — tracker

Two separate things live here:
1. **Pending change request** — the additions/removals/layout changes in
   Kirsten's PowerPoint + the full-page screenshots (not yet received).
2. **Kirsten's recurring manual inputs** — the fields Kirsten owns every month.

---

## 1. Pending — awaiting upload

**Status: NOT YET RECEIVED (as of 2026-08-11).**

The brief says full-page screenshots and Kirsten's PowerPoint (requested
additions, removals, and layout changes) will be uploaded. They were not
available when this project was built, so this delivery is:

- ✅ Faithful reproduction of the live dashboard (master template).
- ✅ Project structure, source labelling, current-month report, docs, feed stubs.
- ⏳ **Kirsten's requested changes — pending the PowerPoint + screenshots.**

**When the files arrive, do this:**
1. Read the PowerPoint; list each change as add / remove / move / relabel, with
   the target section.
2. Apply changes to `index.html` (the master) so every future month inherits them.
3. Regenerate the current month: `python3 scripts/new-month-report.py 2026 <mm>`.
4. Re-run `node scripts/render-check.mjs` and a visual diff against the
   screenshots.
5. Log each applied change in the table below.

| # | Change (from PPT) | Section | Type | Applied? | Commit |
|---|-------------------|---------|------|----------|--------|
| _ | _(to be filled once the PowerPoint is received)_ | | | | |

> A change already applied from the **written brief** (not the PPT): geography
> was moved from GA4 to **Google Ads** (source of truth), and GA4 was scoped to
> the landing-page section only. See `docs/DATA-SOURCES.md`.

---

## 2. Kirsten's recurring manual inputs (every reporting month)

These are **not** pulled from any API — Kirsten supplies them. Enter them in the
month's `reports/YYYY-MM/data.json` (or `index.html` where noted) each cycle.

| Input | Where it appears | Where to enter |
|-------|------------------|----------------|
| **Monthly budget & daily cap** | KPI band + Budget section | `index.html` budget rows / KPI (move to a `budget` block in `data.json` when formalised) |
| **Budget split per campaign** (daily/monthly, %s, donut) | Budget Allocation | Budget section in `index.html` |
| **Retention rate** (confirmed 75%), **cancellation** (3%), **gross margin** | LTV & ROAS calculator defaults | `index.html` LTV slider defaults |
| **Pause / partner-conflict decisions** (e.g. Engineers pause) | Campaign table, PMax cards | Static badges + commentary |
| **Priority / build order** for new PMax groups | PMax Strategy & Group Selector | Static |
| **"Creative brief ready" status** per group | PMax cards | Static |
| **Target ROAS** | KPI band | Static (strategy) |
| **Effective-from date** for the budget | Budget subheader | Static |

Anything Kirsten changes that is currently hard-coded should, over time, migrate
into the month `data.json` so producing a month becomes data-entry, not editing
HTML. That refactor is noted in `README.md` (monthly workflow).

---

## 3. Open questions for Kirsten / the client

- **Reporting month:** this build assumes the current reporting month is **July
  2026** (`reports/2026-07/`). Confirm — the live reference's latest data was May
  2026, and today is Aug 2026. If it should be a different month, run
  `scripts/new-month-report.py` for that month.
- **Budget:** is the $18k/month split still current for the reporting month?
- **LOB refresh:** the LOB (Looker) figures were last transcribed May 2026 — is a
  newer LOB report available for the reporting month?
- **Campaign names:** exact live Google Ads campaign names, to lock the
  name → key mapping (`GOOGLE_ADS_CAMPAIGN_MAP`).
