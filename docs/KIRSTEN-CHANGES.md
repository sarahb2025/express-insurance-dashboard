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

**Files received 2026-08-11:** `Express_Insurance_Dashboard_changes_1.pptx` (9 annotated
slides) and `Express_Insurance___July_2026_Commentary.docx` (July manual commentary).

| # | Change (from PPT) | Section | Type | Applied? |
|---|-------------------|---------|------|----------|
| G1 | Everything should pull from data — minimise static/manual figures | global | principle | ✅ (data-driven where feasible; honest placeholders elsewhere) |
| G2 | The dates line by "Performance Overview" is the ONLY dates instance — remove all other (stale) date labels | global | remove | ✅ |
| G3 | "Upload data" button hidden from client — remove it (commentary sent to us instead) | control bar | remove | ✅ |
| 1a | Rename "Total Cost" → "Spend" | Performance | relabel | ✅ |
| 1b | Campaign table shows only campaigns active in the period / currently active (not all history) | Performance | logic | ✅ |
| 1c | Remove the "Assessment" column | Performance | remove | ✅ |
| 1d | Remove the "Status" column (static) | Performance | remove | ✅ |
| 2 | Budget rows + subtext auto from data (Looker); subtext format "Type — ROAS x.xx"; no manual figures | Budget | restructure | ✅ (data-driven `budget` block; source = Looker/manual) |
| 3a | Rename title → "Performance Max & Asset Group Overview" | PMax | relabel | ✅ |
| 3b | Replace 5 static cards with an auto asset-group table (Spend, Conversions, Conv Value, ROAS) | PMax | restructure | ✅ |
| 3c | Commentary below as a blue "info" box (ℹ️) | PMax | add | ✅ |
| 4 | LTV tables flagged as static — should auto-update | LTV & ROAS | logic | ✅ (LOB now data-driven; kept section; date removed) |
| 5 | Remove PMax Group Selector entirely | Future Groups | remove | ✅ (+ nav link removed) |
| 6 | Remove Key Findings commentary (dup of new Slide-3 commentary) | More Insights | remove | ✅ (also removed the stale static summary-tile band — see note) |
| 7a | Geo breakdown auto-updating | More Insights › Geo | logic | ✅ (Google Ads feed) |
| 7b | Replace the two green/yellow bubbles with one info commentary field | More Insights › Geo | restructure | ✅ |
| 7c | Geo showed GA4 conversions (hundreds) vs Google Ads 41.81 — must be Google Ads or clearly GA4-labelled | More Insights › Geo | correctness | ✅ (Google Ads = source of truth) |
| 7d | Remove the 3 bottom cards (NSW/QLD/Next step) | More Insights › Geo | remove | ✅ |
| 8a | Landing-page top-4 auto-populating | More Insights › LP | logic | ✅ (GA4 feed) |
| 8b | Remove static pills ("Traffic quality review" etc.) | More Insights › LP | remove | ✅ |
| 8c | Not hardcoded to Accountant page / old date range | More Insights › LP | logic | ✅ (page/date no longer hardcoded; feed-driven) |
| 8d | Info section below = commentary field (headline + paragraph) | More Insights › LP | add | ✅ |
| 9 | Remove creative "Messaging & Structure Review" section | More Insights | remove | ✅ |

### Judgement calls — CONFIRMED by client (2026-08-11), locked for the review version
1. Key Findings accordion **and** the five state-summary tiles stay **removed** (Slide 6). ✅
2. Budget breakdown stays labelled **Looker / manual** until Sarah confirms its underlying data source. ✅
3. Asset Group and LOB/LTV figures stay clearly marked **Awaiting data** — no figures fabricated. ✅

### Original judgement-call notes (for context)
- **Slide 6:** "Remove entirely" — I removed both the Key Findings accordion **and** the
  5 static summary tiles above it (Accounting ROAS 0.87, Inner West, 23.7%, 85.6%,
  Brisbane), since they were hardcoded, stale and mixed-source. If you want those tiles
  back as an auto-populated KPI strip, say so.
- **Budget (Slide 2):** there is no Looker Studio API to read a budget breakdown. The
  budget block is now driven by the month's `data.json` (labelled Looker/manual). Confirm
  the source you want it read from (see `docs/INTEGRATIONS.md` › Looker).
- **Asset-group table (Slide 3) & LOB (Slide 4):** Google Ads asset-group spend/conv and
  Looker LOB figures aren't in the reference data, so these render as clearly-labelled
  placeholders until the real exports/feed are supplied — never fabricated.

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
