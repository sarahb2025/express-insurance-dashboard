# Data sources — section-by-section classification

Every block on the dashboard is classified by where its data comes from. On the
page itself this is shown as a coloured **source chip** in each section header
(and a legend under the KPI bar). This file is the authoritative reference.

## Categories

| Chip | Meaning |
|------|---------|
| **Static** | Hard-coded content: copy, structure, analyst commentary, fixed assumptions. Changes only when someone edits the file. |
| **Kirsten — manual** | Numbers/decisions supplied by Balmer Agency / Kirsten each month (typed into the month's `data.json` or the HTML). |
| **Google Ads** | Live from the Google Ads API. **Source of truth for conversions, conversion value, ROAS, and geography.** |
| **GA4** | Live from GA4 (property `358319621`). **Used only for landing-page traffic & engagement.** |
| **Looker Studio** | From the LOB (line-of-business) report in Looker Studio — average revenue, policy counts. Currently transcribed manually (no direct report API). |
| **Other / unknown** | Source not yet confirmed — must be resolved before the number is trusted. |

---

## Header & chrome

| Element | Source | Notes |
|---------|--------|-------|
| Logos, agency name, "SEM Strategy" badge | **Static** | `assets/`. |
| Header date badge | **Static** (auto) | Shows `monthOrder[0]` from the active dataset. |
| Nav, section titles, footer, contact email | **Static** | |
| Reporting-period selector (Monthly / Last 30 / Custom), Upload button | **Static** (control) | Drives which dataset/range is rendered. |
| Password gate | **Static** | Client-side djb2 hash. Not real security. |

## KPI band (green bar)

| KPI | Source | Field |
|-----|--------|-------|
| Monthly Budget · $/day | **Kirsten — manual** | Budget is set by the agency. |
| Account ROAS · Non-brand | **Google Ads** | `kpi.accountRoas`, `kpi.nonBrand` |
| Best Campaign · ROAS | **Google Ads** | `kpi.bestName`, `kpi.bestRoas` |
| PMax ROAS + note | **Google Ads** (value) · **Static** (note) | `kpi.pmaxRoas`, `pmaxNote` |
| Total Conv. Value | **Google Ads** | `kpi.convValue` |
| Target ROAS | **Static** | Strategy target (2.0+). |

## 1. Performance Overview  (`#perf`)

| Element | Source |
|---------|--------|
| Period / compare labels | **Static** (display strings in the dataset) |
| Stat cards (Impressions, Clicks, Conversions, Conv. Value, Cost, CPC) + % change | **Google Ads** (`stats.*`) |
| Campaign table — Cost, Conversions, CPA, Conv. Value, ROAS | **Google Ads** (`campaigns[]`) |
| Campaign table — Status & Assessment badges | **Static** (`CAMP_META` in `index.html`) |
| "Data source" note | **Static** |

*Feed:* `/api/ads-report`. Feed-status pill shows live / static-fallback / awaiting.

## 2. Budget Allocation  (`#budget`)

| Element | Source |
|---------|--------|
| Daily/monthly split per campaign, %s, donut, total | **Kirsten — manual** | 
| Row descriptions (e.g. "Brand defence") | **Static** |

> The budget split is an agency decision, not a Google Ads pull. It is currently
> hard-coded in the HTML. To make it month-driven, move these values into the
> month `data.json` (a `budget` block) — noted as a future enhancement.

## 3. Performance Max — Asset Group Strategy  (`#pmax`)

| Element | Source |
|---------|--------|
| CPA, ROAS per asset group | **Google Ads** |
| LOB Avg Revenue, policy counts | **Looker Studio** (LOB report) |
| Status, priority, "Creative brief ready", commentary | **Static** (analyst) |
| Partner-conflict / pause decisions | **Kirsten — manual** |

## 4. LTV & ROAS Calculator  (`#ltv`)

| Element | Source |
|---------|--------|
| Average revenue per line of business (`prods` array) | **Looker Studio** (LOB report) |
| Retention 75%, cancellation 3%, gross margin 100% | **Kirsten — manual** (confirmed inputs) |
| All LTV / CPA / net-margin / break-even maths | **Static** (computed in-browser) |

## 5. PMax Group Selector  (`#future`)

| Element | Source |
|---------|--------|
| AOV, policy counts per candidate group | **Looker Studio** (LOB report) |
| Priority ranking, reasons, "copy & brief complete" | **Static** (analyst) |
| Selection interaction | **Static** (control) |

## 6. More Insights — Accountant Targeting Debrief  (`#insights`)

| Sub-block | Source |
|-----------|--------|
| Summary highlight tiles | **Mixed** — Accounting asset ROAS & geo (**Google Ads**); landing-page conv rate & bounce (**GA4**) |
| Key findings (accordion text) | **Static** (analyst), referencing GA4 & Google Ads |
| **Geographic Performance** (bars + city table) | **Google Ads** — *source of truth for geography.* Corrected from GA4. `/api/ads-geo` |
| Location commentary (NSW/QLD/next step) | **Static** |
| **Landing Page Performance** (4 channel cards) | **GA4** (property `358319621`) — landing-page traffic & engagement only. `/api/ga4-landing-page` |
| Landing-page takeaway note | **Static** |
| Accounting asset group — headlines / long headlines / descriptions review | **Google Ads** (ad assets) surfaced as **Static** snapshot; PI/PL/generic tags are **Static** (analyst) |

---

## The source-of-truth split, restated

- Conversions, conversion value, ROAS → **Google Ads only.**
- Geography (converting locations) → **Google Ads only** (not GA4).
- Landing-page sessions / key events / bounce / engagement → **GA4 only.**
- Line-of-business average revenue & policy counts → **Looker Studio (LOB report).**
- Budgets, confirmed rates, pause/partner decisions → **Kirsten (manual).**
- Everything else (copy, structure, targets, commentary) → **Static.**
