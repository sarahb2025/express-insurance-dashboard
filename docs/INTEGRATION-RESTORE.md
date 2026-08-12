# Integration restore & test runbook

Goal: the dashboard pulls figures **directly from Google Ads and GA4** each month
(Omdigi supplies commentary only). This runbook is the exact path to restore and
validate both feeds. **No deploy, no merge, no secrets in the repo.**

---

## 0. Current state (inspected 2026-08-12)

**Live Vercel deployment (the old single-file version):**
- `GET /api/ads-report` → **HTTP 500** `Token refresh failed: invalid_grant`.
  Google Ads has **not** been pulling — figures were served static.
- `GET /api/ga4-geo` → **HTTP 200**, live GA4 (property `358319621`). Working, but
  it feeds **geography**, which per the agreed rules must come from **Google Ads**,
  not GA4. (This is the mismatch Kirsten flagged: GA4 showed geo conversions in the
  hundreds vs Google Ads' ~41.8.)
- `GET /api/ads-geo`, `GET /api/ga4-landing-page` → **404** (don't exist on the old
  deployment).

**This branch (the go-forward code):** correct source-of-truth split, endpoints
written but **not deployed** and **no credentials set**:
- `api/ads-report.js` → KPI band, stat cards, campaign table (Google Ads).
- `api/ads-geo.js` → geography (Google Ads). *Replaces GA4-geo.*
- `api/ga4-landing-page.js` → landing-page cards (GA4 only).
- `lib/google-ads.js` → shared Google Ads client.

---

## 1. What is configured / broken / missing

| Piece | State | Detail |
|---|---|---|
| GA4 property `358319621` | ✅ Configured & live | Confirmed returning data on the old deployment. |
| GA4 landing-page endpoint (`ga4-landing-page.js`) | 🟡 Code ready, not deployed | Needs a service-account key + Viewer on the property. |
| Google Ads endpoints (`ads-report.js`, `ads-geo.js`) | 🟡 Code ready, not deployed | Need all Google Ads credentials below. |
| Google Ads **refresh token** | ❌ Broken | `invalid_grant` — expired/revoked. Must be regenerated. |
| Google Ads dev token / client ID / secret / customer ID | ❔ Missing here | Not in this environment; must be provided as env vars. |
| **PMax asset-group live feed** | ❌ **Missing (not built)** | No endpoint returns asset-group rows yet; the table only reads stored data. **Build task** (see §2.3). |
| Period-over-period % change on stat cards | 🟡 Partial | `ads-report.js` returns values; deltas need a second (prior-period) query. Minor enhancement. |
| npm dependencies | 🟡 Declared, not installed | `@google-analytics/data`, `google-ads-api` — `npm install`. |
| Vercel env vars | ❌ Empty | Must be set (Preview + Production) — never in the repo. |

---

## 2. GOOGLE ADS — restore steps (KPIs, campaigns, geography, asset groups)

### 2.1 Credentials to obtain (env vars only)
| Env var | What it is | Who provides |
|---|---|---|
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Dev token from the **Manager (MCC)** account → API Center (may need Basic-access approval) | **MCC admin** (Balmer / account owner) |
| `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` | OAuth client in a Google Cloud project with the Google Ads API enabled | **Developer** (us) |
| `GOOGLE_ADS_REFRESH_TOKEN` | **Regenerate** (current one is dead) via OAuth Playground, scope `https://www.googleapis.com/auth/adwords`, signed in as a Google user with access to the account | **Developer** + a **Google user with account access** |
| `GOOGLE_ADS_CUSTOMER_ID` | Express Insurance account id, digits only | **Account admin** |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | MCC id, if accessed via manager account | **Account admin** |
| `GOOGLE_ADS_CAMPAIGN_MAP` | Optional JSON mapping live campaign names → keys (brand/pmax/pi/acct/pl/…) | Whoever knows the campaign names |

### 2.2 Wire-up (already coded)
`ads-report.js` (campaign query) and `ads-geo.js` (geographic_view query) both call
`lib/google-ads.js → getCustomer()`, which reads the env vars above. Nothing to
code for KPIs/campaigns/geography — just supply credentials. Confirm the
campaign-name→key mapping against the real account and set `GOOGLE_ADS_CAMPAIGN_MAP`
if names differ from the heuristic.

### 2.3 Build task — PMax asset-group feed (missing)
The asset-group table needs a new endpoint, e.g. `api/ads-asset-groups.js`, GAQL on
the `asset_group` resource:
`SELECT asset_group.name, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM asset_group WHERE segments.date BETWEEN … AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'`,
plus a small `tryLiveAssetGroups()` in the dashboard that maps the result to
`renderAssetGroups([...])`. **I can build this on request** — it's ~1 endpoint + one
frontend hook; it does not need any new credential beyond §2.1.

---

## 3. GA4 — restore steps (landing-page traffic & engagement)

### 3.1 Credentials to obtain
| Env var | What it is | Who provides |
|---|---|---|
| `GA4_PROPERTY_ID` | `358319621` (known) | — |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service-account key JSON (raw or base64) for a Google Cloud project with the **Google Analytics Data API** enabled | **Developer** creates the SA; **GA4 Admin** grants it **Viewer** on property `358319621` |

### 3.2 Wire-up (already coded)
`ga4-landing-page.js` runs a `runReport` on `sessionDefaultChannelGroup`, filtered to
the accountants landing page, returning sessions / key events / conv rate / bounce /
engagement → `renderLandingPage()`. Just supply the service account.

> Note: the old deployment's live GA4 was used for **geo**; going forward GA4 is
> **landing-page only**. The old `ga4-geo` function is retired in this architecture.

---

## 4. Validate BEFORE deploying to production

Do all of this against **local** or a **Vercel Preview** — never production.

### 4.1 Local
```bash
cp .env.example .env      # fill real values locally (.env is git-ignored)
npm install               # installs the two API SDKs
vercel dev                # or any Node host for /api

# Each endpoint: 200 + expected JSON = good; 501 = env not set; 500 = auth/API error
curl -s "http://localhost:3000/api/ads-report?start=2026-06-01&end=2026-06-30" | jq '.kpi, (.campaigns|length)'
curl -s "http://localhost:3000/api/ads-geo?start=2026-06-01&end=2026-06-30"     | jq '.locations[:3]'
curl -s "http://localhost:3000/api/ga4-landing-page?start=2026-06-01&end=2026-06-30" | jq '.channels'
```

### 4.2 Parity checks (prove the numbers are right)
- **Google Ads** conversions / cost / conv value / ROAS for the date range must match
  the **Google Ads UI** (Campaigns view) for the same range.
- **Geography:** city conversions must match the Google Ads **Locations** report — and
  should now read in the **tens** (Google Ads), *not* the GA4 hundreds. This is the
  explicit fix for Kirsten's Slide 7 mismatch.
- **GA4** landing-page sessions/engagement must match the **GA4 UI** for the page and
  range.

### 4.3 In-dashboard
Open the Preview URL: the **feed-status pills** flip to **"live"** (Performance →
Google Ads; Landing Page → GA4), placeholders fill with real figures, geography shows
Google Ads numbers. If a feed fails it falls back to placeholders and the pill says so
— nothing is fabricated.

### 4.4 Sign-off gate before production
- [ ] All three (four, incl. asset groups once built) endpoints return 200 on Preview.
- [ ] Parity checks pass vs the Google Ads and GA4 UIs.
- [ ] Geography reads Google Ads (tens), not GA4 (hundreds).
- [ ] Feed-status pills green; no placeholders remain except intended (budget split until month-end).
- [ ] Secrets only in Vercel env store; none in the repo.

---

## 5. Ownership summary

| Item | Owner |
|---|---|
| Regenerate Google Ads refresh token; dev token; customer/MCC IDs | Balmer / Google Ads account + MCC admin |
| Google Cloud project, OAuth client, GA4 service account | Developer (us) |
| Grant service account **Viewer** on GA4 `358319621` | GA4 Admin |
| Build the PMax asset-group endpoint + hook | Developer (us) — on request |
| Set env vars in Vercel; trigger Preview; production deploy | Whoever holds Vercel project access + your go-ahead |
| Monthly commentary | Omdigi (Kirsten) |
