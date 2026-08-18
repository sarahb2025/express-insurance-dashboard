# Express Insurance — SEM Strategy Dashboard

Client-facing SEM strategy dashboard for **Express Insurance**, produced by
**Balmer Agency**. Recreated from the live reference at
`https://express-insurance-dashboard.vercel.app/`.

The dashboard is a **single self-contained `index.html`** (inline CSS + JS, no
build step) with three optional **Vercel serverless feeds** for live data. It
renders fine with no backend at all — feeds progressively enhance it and fall
back silently to static/placeholder figures.

---

## What's here

| Path | What it is | Data-source status |
|------|-----------|--------------------|
| `index.html` | **Master monthly-report template** (reusable). Faithful reproduction of the live dashboard + a data-source labelling system. | Ships with the reference dataset so it renders as a demo. |
| `reports/2026-07/` | **Current reporting month report** (July 2026), generated from the master. Does **not** overwrite the master. | Placeholders only — no figures fabricated. |
| `data.json` | Reference dataset the master renders from (history through June 2026). | Static reference. |
| `assets/` | Express Insurance + Balmer Agency logos (real PNGs). | Static. |
| `api/ads-report.js` | Google Ads → KPI band, stat cards, campaign table. | **Blocked** — invalid refresh token (see below). |
| `api/ads-geo.js` | Google Ads → geographic conversions (source of truth for geo). | Not yet wired (endpoint new in this recreation). |
| `api/ga4-landing-page.js` | GA4 → landing-page traffic & engagement only. | GA4 is live (property `387516214`); this endpoint needs deploying + creds. |
| `lib/google-ads.js` | Shared Google Ads client helper (kept out of `/api`). | — |
| `scripts/new-month-report.py` | Generates `reports/YYYY-MM/` from the master. | — |
| `scripts/render-check.mjs` | Chromium smoke-test (asserts both pages render, no JS errors). | — |
| `docs/` | Source classification, integration + testing guide, credentials/access, change-request tracker. | — |

> ✅ **Change requests applied (2026-08-11).** The 9-slide PowerPoint and the
> July 2026 commentary document have been incorporated: renamed sections, removed
> sections/columns/labels, data-driven Budget + PMax asset-group table, corrected
> geography source (Google Ads), and manual commentary fields. Every change is
> logged in [`docs/CHANGE-REQUESTS.md`](docs/CHANGE-REQUESTS.md) (with three
> judgement calls flagged for your confirmation). The agency's July commentary is
> populated in `reports/2026-07/data.json`; Google Ads/GA4 figures remain
> placeholders until those exports/feeds are supplied.

---

## Source-of-truth rules (enforced in this build)

- **Google Ads** is the source of truth for **conversions, conversion value,
  ROAS, and geography**.
- **GA4** is used **only** for **landing-page traffic and engagement**.
- The live reference pulled *geography from GA4* — this recreation **corrects
  that**: geography now comes from Google Ads (`/api/ads-geo`), and GA4 is
  scoped to the landing-page section (`/api/ga4-landing-page`).

Every block on the page is tagged with a coloured **source chip**
(Static · Manual · Google Ads · GA4 · Looker Studio · Other/unknown)
and there is a legend under the KPI bar. Full classification:
[`docs/DATA-SOURCES.md`](docs/DATA-SOURCES.md).

---

## Run it locally

No build step. Any static server works; the serverless feeds need `vercel dev`.

```bash
# Static preview (feeds will 404 and the page falls back to static/placeholders):
npm start                 # python3 -m http.server 8099  → http://localhost:8099

# With live feeds (needs env vars set — see docs/CREDENTIALS-AND-ACCESS.md):
npm install
vercel dev
```

### Smoke test

```bash
npm start &                          # serve on :8099
npm install --no-save playwright-core
node scripts/render-check.mjs        # asserts both pages render with no JS errors
```

The client-side password gate is a light shared-password barrier only (it stores
a djb2 hash, not the password) — **not** real access control. Deploy behind
Vercel password protection / SSO if genuine access control is required.

---

## Monthly workflow

1. **Generate the month:** `python3 scripts/new-month-report.py 2026 8`
   → creates `reports/2026-08/index.html` + a fillable placeholder `data.json`.
   The master is never touched.
2. **Fill the data** in `reports/2026-08/data.json` from the correct source
   (see `docs/DATA-SOURCES.md`), then set `"placeholder": false`.
   - Google Ads figures: KPIs, stats, campaign table, geography.
   - The agency's manual inputs: budget split, confirmed retention/cancellation,
     partner-conflict/pause decisions, creative-brief status.
   - Looker Studio LOB: average revenue + policy counts for the LTV / group
     sections.
3. **Verify** with `node scripts/render-check.mjs` (point `BASE` at the month if
   needed) and a visual check.
4. **Deploy** (Vercel). Live feeds override whatever is in `data.json`.

If a feed can't be connected, the affected cells stay as clearly-labelled
placeholders and the feed-status pill shows why — nothing is invented.

---

## Current integration status (2026-08-11)

| Feed | Status | Blocker / next step |
|------|--------|---------------------|
| GA4 landing page | Property **`387516214`** confirmed live on the current deployment. | Deploy `api/ga4-landing-page.js` and grant the service account Viewer. |
| Google Ads report | **Blocked.** `/api/ads-report` returns `invalid_grant` — the OAuth **refresh token is expired/revoked**. | Regenerate `GOOGLE_ADS_REFRESH_TOKEN`. See `docs/INTEGRATIONS.md`. |
| Google Ads geo | New endpoint in this recreation; not yet deployed. | Same Google Ads credentials as above; confirm geo_target fields. |
| Looker Studio (LOB) | No direct report API. Figures are transcribed manually from the LOB report (or its underlying BigQuery/Sheet). | Decide the underlying source to read; see `docs/INTEGRATIONS.md`. |

Full detail, exact permissions, and how to test each feed:
[`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) ·
[`docs/CREDENTIALS-AND-ACCESS.md`](docs/CREDENTIALS-AND-ACCESS.md).
