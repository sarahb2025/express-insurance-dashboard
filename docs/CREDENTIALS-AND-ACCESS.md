# Credentials & access required

This lists **exactly** what access, IDs, and environment variables each live feed
needs. **No secrets are stored in this repo.** All values live as environment
variables (local `.env`, git-ignored) and as encrypted Environment Variables in
the Vercel project. `.env.example` documents the key names.

Nothing below is invented. Where a value is not yet known it is marked
**`<needed>`** and the person/role who can supply it is named.

---

## 1. GA4 — landing-page traffic & engagement

**Property ID:** `358319621`  *(confirmed — the live deployment already serves
GA4 data from this property).*

**Access to grant**
- A **Google Cloud project** with the **Google Analytics Data API** enabled.
- A **service account** in that project (JSON key downloaded).
- That service account added as **Viewer** on GA4 property `358319621`
  (GA4 → Admin → Property Access Management). *Who can grant:* a GA4
  Administrator on the Express Insurance property (Balmer Agency / client).

**Env vars**
| Var | Value | Who supplies |
|-----|-------|--------------|
| `GA4_PROPERTY_ID` | `358319621` | known |
| `GA4_SA_EMAIL` + `GA4_SA_PRIVATE_KEY` | **existing** service-account client_email + private_key (reused; code reads these directly) | already provisioned; **secret** |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | *(alternative)* full key JSON (raw or base64) | developer; **secret** |
| `GOOGLE_APPLICATION_CREDENTIALS` | *(local dev alt.)* path to the key file | developer |

---

## 2. Google Ads — conversions, conversion value, ROAS, geography

**Account:** the Express Insurance Google Ads account. **Customer ID:**
`<needed — digits only, no dashes>` *(from the account; Balmer Agency has access).*
If accessed via a manager account, also the **MCC / login customer ID**
`<needed>`.

**Access to grant**
- A **Google Ads developer token** (Google Ads API Center on the manager
  account; may require Basic/Standard access approval). *Who:* manager-account
  admin.
- An **OAuth 2.0 client** (client ID + secret) in a Google Cloud project with the
  Google Ads API enabled. *Who:* developer.
- A **refresh token** for a Google user that can access the account, scope
  `https://www.googleapis.com/auth/adwords`. **⚠️ The current one is invalid
  (`invalid_grant`) and must be regenerated.**

These same credentials power all four Google Ads endpoints — `/api/ads-report`
(KPIs, campaigns), `/api/ads-geo` (geography), and `/api/ads-asset-groups` (PMax
asset groups). No endpoint needs an additional secret.

**Env vars**
| Var | Value | Who supplies |
|-----|-------|--------------|
| `GOOGLE_ADS_DEVELOPER_TOKEN` | `<needed>` | manager-account admin; **secret** |
| `GOOGLE_ADS_CLIENT_ID` | `<needed>` | developer |
| `GOOGLE_ADS_CLIENT_SECRET` | `<needed>` | developer; **secret** |
| `GOOGLE_ADS_REFRESH_TOKEN` | `<needed — regenerate>` | developer; **secret** |
| `GOOGLE_ADS_CUSTOMER_ID` | `<needed>` | account admin |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | `<needed if MCC>` | account admin |
| `GOOGLE_ADS_CAMPAIGN_MAP` | optional JSON, live campaign name → dashboard key | whoever knows the campaign names |

---

## 3. Looker Studio — LOB (line-of-business) report

**Report:** the LOB report referenced in *LTV & ROAS* and *PMax Group Selector*
(average revenue, policy counts per line of business).

**Access to grant / confirm**
- **View access** to the Looker Studio report itself (for whoever transcribes the
  figures). *Who:* the report owner at Balmer Agency / client.
- **The report's underlying data source** and read access to it — this is the
  important one for any automation. Looker Studio has **no API to read rendered
  report values**, so a live feed must read the source directly:
  - If **BigQuery**: dataset + table id `<needed>`, and a service account with
    `BigQuery Data Viewer` + `BigQuery Job User`.
  - If **Google Sheets**: the Sheet id `<needed>`, shared with a service account.
  - If another connector: `<needed — confirm source>`.

**Env vars:** none defined yet — depends on the source chosen above. Until then
LOB figures are entered manually and dated.

---

## 4. Hosting (Vercel)

- Access to the **Vercel project** that hosts the dashboard (to set env vars and
  deploy). *Who:* current project owner.
- All env vars above set under **Settings → Environment Variables** for
  Production and Preview. Rotate any secret that has been shared insecurely.

---

## 5. Password gate (client-side)

`index.html` contains a djb2 **hash** (not the password) for a light shared-
password barrier. It is **not** access control and needs no credentials. For real
protection use Vercel's password protection or SSO on the project/deployment.

---

## Secret-handling rules

- Never commit real values. `.gitignore` blocks `.env`, `*service-account*.json`,
  `*.pem`, etc.
- Store secrets only in the host's encrypted env store (Vercel) and a local
  git-ignored `.env`.
- Grant service accounts the **minimum** role needed (GA4 Viewer; BigQuery
  read-only).
- If any secret was previously shared in plaintext (chat, docs), **rotate it**.
