# Integrations — how to connect & test each live feed

Three feeds. Each is a Vercel serverless function that reads credentials **only
from environment variables** and returns JSON the front end merges in. Each
fails safe: if it is not configured (`501`) or errors (`500`), the dashboard
keeps its static/placeholder figures and shows a feed-status pill explaining why.
**Nothing is fabricated.**

Set env vars per [`docs/CREDENTIALS-AND-ACCESS.md`](CREDENTIALS-AND-ACCESS.md).
Install deps once: `npm install`.

---

## Feed 1 — GA4 landing page  ·  `GET /api/ga4-landing-page`

**Powers:** the four landing-page channel cards in *More Insights* (sessions,
key events, conv. rate, bounce, engagement). **GA4 is used for nothing else.**

**Status:** GA4 is **live** on the current deployment — property **`358319621`**
(confirmed: the existing `/api/ga4-geo` on the live site returns
`"source":"ga4-live","propertyId":"358319621"`). This recreation repoints GA4 at
its correct section (landing page) via a new `api/ga4-landing-page.js` that needs
deploying and credentialing.

**Connect**
1. In Google Cloud, create/choose a project; enable **Google Analytics Data API**.
2. Create a **service account**; download a JSON key.
3. In **GA4 → Admin → Property Access Management** (property `358319621`), add the
   service-account email as **Viewer**.
4. Set env vars: `GA4_PROPERTY_ID=358319621` and
   `GOOGLE_SERVICE_ACCOUNT_JSON=<the key JSON, raw or base64>`.

**Test**
```bash
curl -s "http://localhost:3000/api/ga4-landing-page?start=2026-05-01&end=2026-05-31" | jq
# Expect: { page, propertyId:"358319621", channels:[{channel:"paidsearch",sessions,keyEvents,convRate,bounceRate,engagement}, ...] }
# 501 => env not set;  500 => auth/permission/quota (detail in body)
```
On the page, open *More Insights* → the "GA4 live" pill next to *Landing Page
Performance* should read **live**; the four cards update.

**Note:** the reference dashboard hard-codes the four landing-page cards from a
GA4 export (Mar–Apr 2026). Until this feed is deployed those static numbers show,
labelled GA4. The `landingPagePlusQueryString` filter targets
`/professional-indemnity-insurance/accountants-insurance`.

---

## Feed 2 — Google Ads report  ·  `GET /api/ads-report`

**Powers:** KPI band, the six stat cards, and the campaign table (conversions,
conversion value, ROAS). **Source of truth.**

**Status: BLOCKED.** The live `/api/ads-report` currently returns:
```json
{"error":"Token refresh failed: {\"error\":\"invalid_grant\",\"error_description\":\"Bad Request\"}"}
```
i.e. the OAuth **refresh token is expired or revoked**. Until fixed, the KPI band,
stat cards and campaign table fall back to the static report figures and the
feed-status pill reads *"static — Google Ads live feed unavailable"*.

**Fix / connect**
1. Google Ads **developer token** (from the manager account, API Center).
2. OAuth client (**client ID + secret**) in the same Google Cloud project.
3. **Regenerate the refresh token** for a Google user with access to the Express
   Insurance account — e.g. via the OAuth Playground (scope
   `https://www.googleapis.com/auth/adwords`, "use your own credentials").
4. Set: `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`,
   `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`,
   `GOOGLE_ADS_CUSTOMER_ID` (digits only), and `GOOGLE_ADS_LOGIN_CUSTOMER_ID`
   (the MCC id) if accessed via a manager account.
5. **Confirm the campaign-name → key mapping.** `lib/google-ads.js` guesses from
   names (brand/pmax/pi/acct/pl/eng/dg). If the real names differ, set
   `GOOGLE_ADS_CAMPAIGN_MAP` to an exact JSON map. Unmapped campaigns are ignored.

**Test**
```bash
curl -s "http://localhost:3000/api/ads-report?start=2026-05-01&end=2026-05-31" | jq
# 200 => { kpi, stats, campaigns:[{key,cost,conv,cpa,convValue,roas}] }
# 501 => env missing (body lists which);  500 => still invalid_grant / API error
```

**Known gap:** period-over-period `chg` (the ↑/↓ % on stat cards) needs a second
query for the previous window. It is returned `null` for now so the front end
shows values without a fabricated delta. Wire the comparison query before
publishing deltas (marked with a NOTE in `api/ads-report.js`).

---

## Feed 3 — Google Ads geography  ·  `GET /api/ads-geo`

**Powers:** *Geographic Performance* (converting locations bars + city table).
**Source of truth for geography — Google Ads, not GA4.** New endpoint in this
recreation (the reference used GA4 for geo; that was corrected).

**Connect:** same credentials as Feed 2 (`getCustomer()` is shared). No extra
setup beyond confirming the geo fields.

**Test**
```bash
curl -s "http://localhost:3000/api/ads-geo?start=2026-05-01&end=2026-05-31" | jq
# 200 => { locations:[{name,tableName,state,conv,prev}, ...] } sorted by conv desc
```

**Confirm before trusting:** `ads-geo.js` queries `geographic_view` with
`segments.geo_target_city` and resolves `geo_target_constant` names. Verify
against the account (city vs region granularity, LOCATION_OF_PRESENCE vs
AREA_OF_INTEREST). Adjust the GAQL if the account reports at region level.

---

## Feed 4 — Looker Studio (LOB report)  ·  no direct API

**Powers:** average revenue & policy counts in *PMax Strategy*, *LTV & ROAS*, and
*PMax Group Selector*.

**Reality:** Looker Studio has **no supported API to read rendered report
values**. These figures are transcribed manually from the LOB report today (last
refresh May 2026), which is why they are labelled *Looker Studio* but behave like
manual input. Options, in order of robustness:
1. **Read the underlying source directly.** If the LOB report is built on
   **BigQuery** or a **Google Sheet**, add a small serverless feed that queries
   that source (service account + read access) and populate the `prods` array /
   group cards from it.
2. **Keep manual.** Update the values in the month's `data.json` (once a `lob`
   block is added) or in `index.html` each time the LOB report is refreshed.

**What a developer must do:** confirm the LOB report's data source (BigQuery
dataset/table or Sheet id) and access model, then either build feed option 1 or
formalise the manual transcription step in the monthly workflow. Until then the
LTV/group sections show the last transcribed LOB figures, dated.

---

## Deploying

- Vercel auto-detects `/api/*.js` as Node serverless functions.
- Add every env var in **Project → Settings → Environment Variables** (Production
  + Preview). Never put secrets in the repo.
- `lib/google-ads.js` sits outside `/api` on purpose so it isn't exposed as a
  route.
- After deploy, hit each endpoint's URL with a date range and confirm the
  feed-status pills flip to **live**.
