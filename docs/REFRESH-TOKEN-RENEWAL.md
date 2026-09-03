# Google Ads refresh-token renewal (Preview only)

When every Google Ads endpoint returns
`{"error":"Google Ads request failed","detail":"invalid_grant"}` for **all**
date ranges (July *and* August alike) while GA4 still works, the shared
`GOOGLE_ADS_REFRESH_TOKEN` has expired. GA4 uses a separate service-account
credential, which is why it keeps working. Nothing in the dashboard code is
wrong — the fix is to mint a new refresh token and store it in **Preview only**.

> Guardrails: never paste a token into a file, commit, chat, or log. Change the
> **Preview** scope only — do not touch Production env vars or the Production
> deployment. The dashboard data, the July report, and Production stay as-is.

---

## 1. Mint a new refresh token with the *correct* OAuth client

A refresh token is bound to the OAuth client that issued it, so you must use the
**same** client that Vercel Preview already stores as `GOOGLE_ADS_CLIENT_ID` /
`GOOGLE_ADS_CLIENT_SECRET`, and authorise with a Google account that has access
to the Express Insurance Google Ads account (Sarah's login / the MCC).

Easiest path — **Google OAuth Playground** (no code, no secrets on disk):

1. In **Google Cloud Console → APIs & Services → Credentials**, open the OAuth
   client used for Preview. Under **Authorised redirect URIs** add
   `https://developers.google.com/oauthplayground` (if not already present) and
   save. (Without this you'll get `redirect_uri_mismatch`.)
2. Go to <https://developers.google.com/oauthplayground>.
3. Click the ⚙ gear (top-right) → tick **Use your own OAuth credentials** →
   paste the Preview **Client ID** and **Client secret**.
4. In **Step 1**, in the "Input your own scopes" box enter:
   `https://www.googleapis.com/auth/adwords` → **Authorize APIs**.
5. Sign in with the Google account that has Google Ads access and grant consent.
   (If the consent screen is in *Testing*, this account must be listed as a
   **Test user** — see §3.)
6. In **Step 2**, click **Exchange authorization code for tokens**. Copy the
   **Refresh token** value. This is the only value you need; keep it off disk.

The Playground forces `access_type=offline` + a consent prompt, so a refresh
token is always returned.

---

## 2. Update `GOOGLE_ADS_REFRESH_TOKEN` — Preview scope only

**Vercel dashboard:** Project → **Settings → Environment Variables** → find
`GOOGLE_ADS_REFRESH_TOKEN`. Confirm you are editing the **Preview**-scoped entry
(leave any Production entry untouched). Replace its value with the new token and
save, with **only the Preview checkbox ticked**.

**Or CLI** (value typed at the prompt, never on the command line):

```bash
vercel env rm  GOOGLE_ADS_REFRESH_TOKEN preview   # remove the stale Preview value
vercel env add GOOGLE_ADS_REFRESH_TOKEN preview   # paste the new value at the prompt
```

Do not run these for `production`. The other Google Ads vars
(`GOOGLE_ADS_DEVELOPER_TOKEN`, `_CLIENT_ID`, `_CLIENT_SECRET`, `_CUSTOMER_ID`,
optional `_LOGIN_CUSTOMER_ID`) are unchanged.

---

## 3. Stop the 7-day expiry: move the consent screen to Production

**Yes — do this**, or the token will expire again in seven days. While the
OAuth **consent screen** publishing status is **Testing**, Google expires
refresh tokens after **7 days**. Fix it once:

- Google Cloud Console → **APIs & Services → OAuth consent screen** →
  **Publishing status: Testing** → click **Publish app** → confirm. Status
  becomes **In production**. Refresh tokens then persist (they no longer expire
  on the 7-day testing clock).
- The `.../auth/adwords` scope is sensitive, so Google may show an
  "unverified app" notice. For first-party internal use with a single account
  you can proceed; full Google verification is only needed for wide public
  distribution.
- Alternative, if the Google account is inside a Google **Workspace org**: set
  **User type = Internal** instead — Internal apps have no 7-day testing expiry.

Important scope note: this is a **Google Cloud Console** setting for the OAuth
app. It does **not** modify the Vercel Production deployment or any Vercel env
var — it is a separate system from the dashboard's Production environment.

---

## 4. Redeploy Preview and retest (no credential exposure)

Env-var changes apply to **new** deployments, so trigger a fresh **Preview**
build (push to the Preview branch, or Vercel → Deployments → redeploy the
Preview deployment, or run `vercel` — never `vercel --prod`).

Then re-run the safe diagnostics (report data only, no secrets). Expect HTTP
**200** with a populated `_debug` for both months:

```bash
curl -s ".../api/ads-report?start=2026-08-01&end=2026-08-31&debug=1"   # rowCount > 0, mappedKeys populated
curl -s ".../api/ads-report?start=2026-07-01&end=2026-07-31&debug=1"   # July still healthy
curl -s ".../api/ads-asset-groups?start=2026-08-01&end=2026-08-31&debug=1"
curl -s ".../api/ads-geo?start=2026-08-01&end=2026-08-31&debug=1"
```

Then open the dashboard: the Google Ads feed pills flip to **live** and the
Performance Overview, campaign table, PMax asset-group table and Geographic
Performance populate for August (and July). If a call still fails:

- `invalid_grant` again → the token was minted with a different OAuth client, or
  the authorising account lacks Google Ads access.
- `200` but `rowCount: 0` → wrong `GOOGLE_ADS_CUSTOMER_ID` for Preview, or the
  window has no data.
- `200`, `rowCount > 0`, `unmappedNames` populated → campaigns were renamed;
  add the names to `GOOGLE_ADS_CAMPAIGN_MAP` (Preview) — no code change.

Geography/geo remains Google Ads (source of truth); GA4 stays landing-page only.
No dashboard figures are entered by hand — they populate live once the token is
valid.
