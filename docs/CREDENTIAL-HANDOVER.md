# Technical handover — Express Insurance dashboard feeds (Preview only)

> Send to whoever administers the Google Ads MCC, the Google Cloud project, and
> the Vercel project. Scope is the **Preview** environment only.

---

**Subject:** Access + Preview env vars to switch on the Express Insurance dashboard feeds

Hi [name],

We're connecting the Express Insurance SEM dashboard to pull figures directly from
**Google Ads** (KPIs, campaigns, PMax asset groups, geography) and **GA4**
(landing-page traffic). Everything below targets the **Vercel Preview**
environment only — **please don't deploy to Production or change any Production
variables.** We'll validate on Preview first.

**Important — credential handling:** enter every secret **directly into Vercel**
(or generate it in the respective console). **Do not paste any credential value
into Claude, Slack, email, a ticket, or the repository.** We only ever need to see
variable **names and status**, never values.

## 1. What we need you to set up

**A. Google Ads**
1. **Regenerate the OAuth refresh token** for a Google user with access to the
   Express Insurance account (scope `https://www.googleapis.com/auth/adwords`). The
   current one is failing with `invalid_grant`, which is why Google Ads isn't
   pulling.
2. Confirm/provide (as env vars, not to us): **developer token** (from the MCC API
   Center), the **OAuth client ID + secret**, the **customer ID** (digits only),
   and the **login-customer/MCC ID** if access is via a manager account.

**B. GA4**
3. In a Google Cloud project with the **Google Analytics Data API** enabled, create
   a **service account** and download its JSON key.
4. In GA4 → Admin → Property Access Management, grant that service account
   **Viewer** on property **`358319621`**.

## 2. Environment variables — add to the **Preview** environment only

| Variable | Required | What it holds |
|----------|:---:|---------------|
| `GA4_PROPERTY_ID` | ✅ | `358319621` (not secret) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ✅ | the service-account key JSON (raw or base64) |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | ✅ | MCC developer token |
| `GOOGLE_ADS_CLIENT_ID` | ✅ | OAuth client ID |
| `GOOGLE_ADS_CLIENT_SECRET` | ✅ | OAuth client secret |
| `GOOGLE_ADS_REFRESH_TOKEN` | ✅ | the **regenerated** refresh token |
| `GOOGLE_ADS_CUSTOMER_ID` | ✅ | account ID, digits only, no dashes |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | ⬜ | MCC ID, only if via a manager account |
| `GOOGLE_ADS_CAMPAIGN_MAP` | ⬜ | optional JSON mapping campaign names → keys |

These nine cover all the feeds — no per-endpoint extras.

## 3. How to add them to Preview (values never leave the console)

**Dashboard:** Vercel → the project → **Settings → Environment Variables → Add**.
For each row above, paste the value and tick **Preview** only (leave Production
unticked). Save.

**Or CLI** (from the project, prompts for each value — nothing is written to disk):
```bash
vercel env add GA4_PROPERTY_ID preview
vercel env add GOOGLE_SERVICE_ACCOUNT_JSON preview
vercel env add GOOGLE_ADS_DEVELOPER_TOKEN preview
vercel env add GOOGLE_ADS_CLIENT_ID preview
vercel env add GOOGLE_ADS_CLIENT_SECRET preview
vercel env add GOOGLE_ADS_REFRESH_TOKEN preview
vercel env add GOOGLE_ADS_CUSTOMER_ID preview
# optional:
vercel env add GOOGLE_ADS_LOGIN_CUSTOMER_ID preview
vercel env add GOOGLE_ADS_CAMPAIGN_MAP preview
```

## 4. Confirm presence — **names/targets only, no values**

```bash
vercel env ls        # lists NAME, TARGET (Preview/Production/Development), CREATED — never values
```
Please share back only that **list of names + targets** (or a screenshot with
values hidden) so we can confirm all nine are present on Preview. That's all we
need — please don't send any value.

## 5. What happens next (our side)

Once the Preview variables are set, we run our validation against the Preview URL
(unit test + a `curl` per endpoint + parity checks vs the Google Ads and GA4 UIs).
Nothing is promoted to Production until you and the client sign off.

Thanks!
[your name]

---

### Quick reference we can run once a shell has the vars (e.g. after `vercel env pull`)
```bash
bash scripts/check-preview-env.sh   # prints each var as [SET]/[MISSING] — never a value
```
