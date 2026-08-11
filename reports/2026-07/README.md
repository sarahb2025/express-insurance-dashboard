# Express Insurance — SEM report · July 2026

This is the **current reporting-month report**, generated from the master
template (`/index.html`). It is a separate, self-contained copy — editing or
regenerating it never changes the master.

**Files**
- `index.html` — the report (assets load from `../../assets`, data from local `data.json`).
- `data.json` — this month's figures. Currently a **fillable placeholder**
  (`"placeholder": true`) so the report shows clearly-labelled *awaiting data*
  cells. **Nothing is fabricated.**

## Status

All live figures are placeholders until the sources below are supplied. The
feed-status pills on the page show live / static / awaiting per feed.

## How to publish real July figures

1. Open `data.json`. Set `"placeholder": false`.
2. Fill each field from the **correct source** (see `../../docs/DATA-SOURCES.md`):
   - **Google Ads** → `months["July 2026"].kpi`, `.stats`, `.campaigns`, `.geo.locations`
     (conversions, conversion value, ROAS, geography).
   - **Kirsten (manual)** → budget split, confirmed retention/cancellation,
     pause/partner decisions (see `../../docs/KIRSTEN-CHANGES.md`).
   - **Looker Studio (LOB)** → average revenue / policy counts used by the
     LTV & group sections.
3. If the live feeds are connected (`/api/ads-report`, `/api/ads-geo`,
   `/api/ga4-landing-page`), they override `data.json` automatically for their
   sections — you only need to hand-enter what has no live feed.
4. Verify: serve the repo and run `node ../../scripts/render-check.mjs`
   (or just open the page and confirm no `—` remain where data should be).

## Regenerate from the master

If the master template changes (e.g. Kirsten's PowerPoint edits land):

```bash
python3 scripts/new-month-report.py 2026 7   # run from repo root
```

This rewrites `index.html` from the master but **keeps** an existing `data.json`
(it will not overwrite figures you've entered).
