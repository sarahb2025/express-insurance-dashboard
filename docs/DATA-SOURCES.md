# Data sources — section-by-section classification

Every block on the dashboard is classified by where its data comes from. On the
page itself this is shown as a coloured **source chip** in each section header
(and a legend under the KPI bar). This file is the authoritative reference and
reflects the layout **after Kirsten's requested changes** (see
`KIRSTEN-CHANGES.md`).

## Categories

| Chip | Meaning |
|------|---------|
| **Static** | Hard-coded content: copy, structure, fixed assumptions. Changes only when the file is edited. |
| **Kirsten — manual** | Numbers/decisions/commentary supplied by Balmer Agency / Kirsten each month (typed into the month `data.json`). |
| **Google Ads** | Live from the Google Ads API. **Source of truth for conversions, conversion value, ROAS, and geography.** |
| **GA4** | Live from GA4 (property `358319621`). **Used only for landing-page traffic & engagement.** |
| **Looker Studio** | From the LOB report / budget breakdown in Looker Studio. Currently transcribed into `data.json` (no direct report API). |
| **Other / unknown** | Source not yet confirmed. |

---

## Header & chrome

| Element | Source | Notes |
|---------|--------|-------|
| Logos, agency name, "SEM Strategy" badge | **Static** | `assets/`. |
| Header date badge | **Static** (auto) | Shows `monthOrder[0]`. |
| Reporting-period selector | **Static** (control) | Drives which dataset/range renders. **The date beside "Performance Overview" is the single source of dates** — all other per-section dates were removed per client request. |
| Upload-data button | **Removed** | Was client-visible; removed per request (agency ingests data server-side). |
| Password gate | **Static** | Client-side djb2 hash. Not real security. |

## KPI band (green bar)

| KPI | Source |
|-----|--------|
| Monthly Budget · $/day | **Kirsten — manual** |
| Account ROAS · Non-brand | **Google Ads** |
| Best Campaign · ROAS | **Google Ads** |
| PMax ROAS + note | **Google Ads** (value) · **Static** (note) |
| Total Conv. Value | **Google Ads** |
| Target ROAS | **Static** |

## 1. Performance Overview  (`#perf`)

| Element | Source |
|---------|--------|
| Period / compare labels (the only dates on the page) | **Static** display strings |
| Stat cards — Impressions, Clicks, Conversions, Conv. Value, **Spend** (was "Total Cost"), Avg. CPC + % change | **Google Ads** (`stats.*`) |
| Campaign table — Campaign, **Spend, Conversions, CPA, Conv. Value, ROAS** | **Google Ads** (`campaigns[]`) |

Changes: "Total Cost" → **Spend**; the **Status** and **Assessment** columns were
removed (both were static); the table now shows **only campaigns active in the
period / currently active** (paused + no-activity campaigns are hidden).
*Feed:* `/api/ads-report`.

## 2. Budget Allocation  (`#budget`)

| Element | Source |
|---------|--------|
| Rows, per-campaign daily/monthly, %s, donut, total | **Other / unknown — source unconfirmed** — driven by the `budget` array in `data.json` |
| Row subtext, auto-formatted **"Type — ROAS x.xx"** | **Static** format · ROAS pulled live from the campaign of matching `key` (**Google Ads**) |

**Source status:** the **original dashboard showed static, hard-coded budget
figures with no source label** (unlike Performance/LTV/Group Selector, which each
cited a source). Kirsten's Slide 2 note *asked* whether it should come from Looker
Studio, but that is a request, not a confirmation — so the section is labelled
**"Source unconfirmed"** and carries a discreet note to that effect. It is fully
data-driven and ready to connect the moment the true source is confirmed by Sarah;
do **not** assert Looker/manual until then. `budget[]` items:
`{name, type, key, daily, monthly[, color]}`.

## 3. Performance Max & Asset Group Overview  (`#pmax`)

| Element | Source |
|---------|--------|
| Asset-group table — Asset Group, Spend, Conversions, Conv. Value, ROAS | **Google Ads** (`months[m].assetGroups[]`) |
| Commentary (blue ℹ️ info box) | **Kirsten — manual** (`commentary.pmax`) |

Changes: renamed from "Performance Max — Asset Group Strategy"; the five static
strategy cards were replaced by the auto table + a single commentary box. Until
the asset-group export is supplied the table shows an "awaiting" row.

## 4. LTV & ROAS Calculator  (`#ltv`)

| Element | Source |
|---------|--------|
| Average revenue per line of business | **Looker Studio** (LOB) — `data.json` `lob[]`, else built-in defaults |
| Retention 75%, cancellation 3%, gross margin 100% | **Kirsten — manual** |
| All LTV / CPA / net-margin / break-even maths | **Static** (computed in-browser) |

The `lob` figures are now overridable from `data.json` (were hard-coded). No live
Looker API exists, so they carry the last transcribed LOB values until refreshed.

## 5. ~~PMax Group Selector~~ — **removed** per client request.

## 6. More Insights — Accountant Targeting Debrief  (`#insights`)

| Sub-block | Source |
|-----------|--------|
| **Geographic Performance** (bars + city table) | **Google Ads** — *source of truth for geography.* `/api/ads-geo` |
| Geography commentary (single ℹ️ field) | **Kirsten — manual** (`commentary.geo`) |
| **Landing Page Performance** (4 channel cards) | **GA4** (property `358319621`) — landing-page traffic & engagement only. `/api/ga4-landing-page` |
| Landing-page commentary (headline + paragraph) | **Kirsten — manual** (`commentary.landing`) |

Changes: the 5-tile summary band, the Key Findings accordion, the two
green/yellow geo bubbles, the three "What this means" cards, the static landing
pill labels, and the creative "Messaging & Structure Review" block were all
removed. Geography was corrected from GA4 to **Google Ads** (the live reference
showed GA4 conversions in the hundreds while Google Ads had ~41.8 for June).
The landing-page section is no longer hard-coded to the accountants page / an old
date range — it is feed-driven.

---

## The source-of-truth split, restated

- Conversions, conversion value, ROAS → **Google Ads only.**
- Geography (converting locations) → **Google Ads only** (not GA4).
- Landing-page sessions / key events / bounce / engagement → **GA4 only.**
- Line-of-business average revenue → **Looker Studio.**
- Budget breakdown → **source unconfirmed** (original was static/hard-coded; awaiting Sarah's confirmation).
- Confirmed rates and all commentary → **Kirsten (manual).**
- Structure, targets, calculator maths → **Static.**
