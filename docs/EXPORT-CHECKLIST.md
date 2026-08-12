# Export checklist — everything needed to complete the July 2026 report

Give these exports to whoever fills `reports/2026-07/data.json`. Once the file is
populated and `"placeholder"` is set to `false`, every "Awaiting data" cell fills
in. **Reporting month: 1–31 July 2026.** For the ↑/↓ change figures, also pull the
**comparison month: 1–30 June 2026**.

Source-of-truth rules still apply: **Google Ads** for conversions, conversion
value, ROAS and geography; **GA4** for landing-page traffic & engagement only.

---

## A. GOOGLE ADS

Currency AUD. Export each as **CSV** (or Google Sheet). Use the account's own
conversion columns — do **not** substitute GA4 numbers.

### A1. Campaign performance → KPI band, stat cards, campaign table
- **Where:** Campaigns view.
- **Date range:** 1–31 Jul 2026 **and** a second export for 1–30 Jun 2026 (for % change).
- **Segment / rows:** one row per **Campaign** (not per day).
- **Columns:** Campaign name · Campaign status · Impressions · Clicks · Cost ·
  Conversions · Conversion value · Avg. CPC · Cost/conv. (CPA) · Conv. value/cost (ROAS).
- **Include** Brand, Performance Max, Professional Indemnity, Accountant Insurance,
  Public Liability, and any newly active campaign (e.g. the new Management
  Consultants Search group). Paused/zero-activity campaigns are auto-hidden.
- **Maps to:** `months["July 2026"].stats.*`, `.campaigns[]` (key/cost/conv/cpa/
  convValue/roas), and `.kpi` (accountRoas, nonBrand, bestName, bestRoas, pmaxRoas,
  convValue). *Non-brand ROAS = all campaigns except Brand — the per-campaign rows
  let us compute it, no separate export needed.*

### A2. PMax asset-group performance → PMax "Asset Group Overview" table
- **Where:** the Performance Max campaign → **Asset groups**.
- **Date range:** 1–31 Jul 2026.
- **Rows:** one per asset group (Accountants, General, IT Contractors, etc.).
- **Columns:** Asset group · Cost (Spend) · Conversions · Conversion value ·
  Conv. value/cost (ROAS).
- **Maps to:** `months["July 2026"].assetGroups[]` = `{name, spend, conv, convValue, roas}`.

### A3. Geographic performance → geography bars + city table
- **Where:** Locations / **Geographic** report.
- **Date range:** 1–31 Jul 2026 **and** 1–30 Jun 2026 (for the "vs prev." column).
- **Breakdown:** by **City** (include Region/State). Use **"User location"**
  (where the user is), to match the dashboard label.
- **Columns:** City · Region/State · Conversions. (Conversion value optional.)
- **Maps to:** `months["July 2026"].geo.locations[]` =
  `{name, tableName, state, conv, prev}` (top ~10 by conversions).

---

## B. GA4  (property 358319621) — landing-page traffic & engagement ONLY

Export as **CSV** or share the GA4 exploration.

### B1. Landing-page performance by channel → the four landing-page cards
- **Date range:** 1–31 Jul 2026. (June optional, only if you want MoM in commentary.)
- **Dimension:** **Session default channel group** — keep Cross-network, Paid
  Search, Direct, Organic Search.
- **Filter:** **Landing page + query string** begins with
  `/professional-indemnity-insurance/accountants-insurance`
  (add a second export per any other landing page you want shown — the section is
  no longer locked to one page).
- **Metrics:** Sessions · Key events · Session key event rate · Bounce rate ·
  Average engagement time per session.
- **Maps to:** `channels[]` = `{channel, sessions, keyEvents, convRate,
  bounceRate, engagement}` (channel = crossnet | paidsearch | direct | organic).
- **Do NOT** use GA4 for conversions/ROAS/geography — those come from Google Ads (A1–A3).

---

## C. LOB (Looker Studio) — LTV & ROAS calculator
- **Keep the May 2026 figures** already in the dashboard (labelled "as at May 2026").
  Only supply a refresh if a newer LOB report exists.
- **If refreshing:** average revenue + policy count per line of business.
- **Maps to:** `lob[]` = `{n, r, t}` (name, avg revenue, type: new2 | new3 | ex).

## D. Budget breakdown — Looker Studio (confirmed)
- **Total is fixed at $18,000/month** (`budgetTotal`). The per-campaign **split**
  comes from the **Looker Studio budget breakdown** and is provided **at
  month-end**.
- At month-end, supply per campaign: name · type (Search/PMax) · key
  (brand/pmax/pi/acct/pl/…) · daily budget · monthly budget → `budget[]` =
  `{name, type, key, daily, monthly}`. Percentages, donut and total are computed;
  ROAS in each row is pulled live from Google Ads.

---

## What stays "Awaiting data" until the above arrive
KPI band (except Target ROAS) · all six stat cards · campaign table · PMax
asset-group table · geography · the four GA4 landing-page cards · budget.
Commentary (PMax, geography, landing) is already populated from Kirsten's July
document. LTV/LOB shows the dated May 2026 figures. **Nothing is fabricated.**
