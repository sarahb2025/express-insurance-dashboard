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
  not GA4. (This is the mismatch the client flagged: GA4 showed geo conversions in the
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
| **PMax asset-group live feed** | ✅ **Built (this branch)** | `api/ads-asset-groups.js` + `tryLiveAssetGroups()` + feed-status pill; unit-tested. Needs the same Google Ads credentials as the other Ads feeds — no new env var. (see §2.3) |
| Period-over-period % change on stat cards | 🟡 Partial | `ads-report.js` returns values; deltas need a second (prior-period) query. Minor enhancement. |
| npm dependencies | 🟡 Declared, not installed | `@google-analytics/data`, `google-ads-api` — `npm install`. |
| Google Ads client library version | ✅ Fixed on branch | Was `^17` (targets the long-sunset Google Ads API **v16** → `12 UNIMPLEMENTED: GRPC target method can't be resolved`). Bumped to **`^24.1.0`** (Google Ads API **v24**). Library interface (`GoogleAdsApi`/`Customer.query`) and all GAQL are unchanged. |
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

### 2.3 PMax asset-group feed — BUILT (2026-08-12)
- **Endpoint:** `api/ads-asset-groups.js` — GAQL on the `asset_group` resource:
  `SELECT asset_group.name, campaign.name, metrics.cost_micros, metrics.conversions,
  metrics.conversions_value FROM asset_group WHERE segments.date BETWEEN <start> AND
  <end> AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'`. Aggregates per
  asset group → `{name, spend, conv, convValue, roas}` (ROAS = value/spend, guarded
  against divide-by-zero), sorted by conversion value. Uses the shared
  `lib/google-ads.js` client; **no new env var** (§2.1 credentials only).
- **Frontend:** `tryLiveAssetGroups()` fetches `/api/ads-asset-groups`, calls
  `renderAssetGroups()`, and sets the `#pmax-feed-status` pill
  (live / static-fallback / awaiting). Wired into every date-mode handler and the
  initial load.
- **Error handling:** 400 (missing dates), 501 (not configured, lists missing env),
  500 (API/auth error). On any failure the table keeps its "Awaiting Google Ads
  asset-group report" row — never fabricated.
- **Tests / validation:** `node scripts/test-asset-groups.js` (12 offline assertions
  on the aggregation math — no creds needed). Live check once credentialed:
  `curl -s ".../api/ads-asset-groups?start=2026-07-01&end=2026-07-31" | jq '.assetGroups'`
  and confirm the table + pill go live.

---

## 3. GA4 — restore steps (landing-page traffic & engagement)

### 3.1 Credentials to obtain
| Env var | What it is | Who provides |
|---|---|---|
| `GA4_PROPERTY_ID` | `387516214` (marketing site — *Express Insurance Brokers Pty Ltd 2.0*) | — |
| `GA4_SA_EMAIL` + `GA4_SA_PRIVATE_KEY` (or `GOOGLE_SERVICE_ACCOUNT_JSON`) | Service-account credential for a project with the **Google Analytics Data API** enabled | **GA4 Admin** grants the SA **Viewer** on property `387516214` |

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
  explicit fix for the client's Slide 7 mismatch.
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
| Grant service account **Viewer** on GA4 `387516214` (marketing site) | GA4 Admin |
| Build the PMax asset-group endpoint + hook | Developer (us) — ✅ done (this branch) |
| Set env vars in Vercel; trigger Preview; production deploy | Whoever holds Vercel project access + your go-ahead |
| Monthly commentary | Omdigi |

---

## 6. Validation log

**2026-08-13 — Preview endpoint validation: PASS.** On the protected Vercel Preview
(Deployment Protection on; Production untouched), all four feeds return HTTP 200:

| Endpoint | Result |
|---|---|
| `/api/ads-report` | ✅ 200 |
| `/api/ads-geo` | ✅ 200 |
| `/api/ads-asset-groups` | ✅ 200 |
| `/api/ga4-landing-page` | ✅ 200 |

Fix chain that got here (all branch-only, no Production changes):
1. GA4 credential reuse (`GA4_SA_EMAIL` + `GA4_SA_PRIVATE_KEY`).
2. Trim whitespace on Google Ads scalar env vars (fixed `illegal metadata characters`).
3. Regenerated Google Ads refresh token against the Preview client (fixed `invalid_grant`).
4. `google-ads-api` `^17` → `^24.1.0`, Google Ads API v16 → v24 (fixed `UNIMPLEMENTED`).

Next: on-dashboard visual/data validation (see `docs/FINAL-VALIDATION-CHECKLIST.md`).
Nothing merged or promoted to Production.

---

## 7. GA4 landing-page finding (2026-08-13) — likely wrong property

`?debug=1` on the live GA4 endpoint (property **358319621**) for July:
- `rowCount: 0` for `/professional-indemnity-insurance/accountants-insurance`.
- `topLandingPages` (unfiltered, top by sessions) contained **only** two legacy
  quote-app paths, 1 session each:
  `/ka/express_psw_web/index.php/accountants/process` and
  `/ka/express_psw_web/index.php/public_liability_insurance/process`.

**Interpretation:** this property contains **no marketing-site landing pages at all**
(not the accountants page, nor any other) — only a legacy `express_psw_web/index.php`
quote application. That is inconsistent with Omdigi's ~160 paid sessions to the
accountants page, so those sessions live in a **different GA4 property** (the one
tracking the marketing website). Most likely **358319621 is the wrong property** for
the landing-page section (it appears to track the legacy quote app); a tracking gap on
an otherwise-correct property is less likely (we'd expect other marketing pages to
appear, and they don't).

**Do NOT** map the dashboard to the legacy `/ka/.../process` paths.

**Blocked on:** the GA4 property ID (and data stream) that tracks the marketing site,
plus the exact landing-page path as stored there. Google Ads feeds are unaffected;
only the GA4 landing-page section is blocked. See the credential-request note.

**RESOLVED (2026-08-13):** the correct property is **`387516214`** — *Express Insurance
Brokers Pty Ltd 2.0* (the marketing site). Its GA4 report shows the accountants page
with 175 sessions in July (100 Paid Search + 60 Cross-network = the ~160 paid). The
path `/professional-indemnity-insurance/accountants-insurance` matches as-is. To
finish, on **Preview** set `GA4_PROPERTY_ID=387516214`,
`GA4_CHANNEL_DIMENSION=sessionPrimaryChannelGroup` (to match the report's "Session
primary channel group"), grant the service account **Viewer** on `387516214`, rebuild,
and re-run `?debug=1` (expect `rowCount` ≥ 4). `358319621` remains the legacy quote-app
property — not used.
