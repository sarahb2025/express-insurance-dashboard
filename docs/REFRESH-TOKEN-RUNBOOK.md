# Admin runbook — regenerate the Google Ads refresh token & add 5 vars to Preview

Scope: **Preview only.** Do not deploy, and do not edit the existing Production
variables' values. **Never paste any value into Claude, Slack, email, a ticket, or
the repo** — values go straight into the OAuth console and Vercel.

Final gap (confirmed): give **Preview** scope to these five (currently Production-only),
and **regenerate** the expired refresh token:
`GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN` (new value),
`GA4_PROPERTY_ID`, `GA4_SA_EMAIL`, `GA4_SA_PRIVATE_KEY`.

---

## A. Regenerate `GOOGLE_ADS_REFRESH_TOKEN`

Use the **same OAuth client** already configured (`GOOGLE_ADS_CLIENT_ID` /
`GOOGLE_ADS_CLIENT_SECRET`) and a Google user with access to the Express Insurance
Ads account (and the MCC, if used).

**Via the OAuth 2.0 Playground**
1. In Google Cloud → APIs & Services → Credentials, open the OAuth client. If it's a
   Web client, temporarily add redirect URI `https://developers.google.com/oauthplayground`
   (you'll remove it in step 7).
2. Open <https://developers.google.com/oauthplayground> → gear icon (top-right) →
   tick **"Use your own OAuth credentials"** → paste the **Client ID** and
   **Client Secret**.
3. Step 1: in "Input your own scopes" enter `https://www.googleapis.com/auth/adwords`
   → **Authorize APIs**.
4. Sign in as the Google user that can access the account; grant consent.
5. Step 2: **Exchange authorization code for tokens** → copy the **Refresh token**.
6. That value becomes the new `GOOGLE_ADS_REFRESH_TOKEN` (Preview) in section B —
   paste it straight into Vercel, nowhere else.
7. Remove the temporary redirect URI from the OAuth client if you added one.

**Why it expired (prevent recurrence):** an `invalid_grant` on a token that used to
work is almost always because the **OAuth consent screen is in "Testing" publishing
status**, where refresh tokens expire after **7 days** (other causes: token revoked,
account password change, or 6-month inactivity). To make it durable, set the consent
screen to **"In production"** (Publishing status) in Google Cloud → APIs & Services →
OAuth consent screen. Then the regenerated token won't expire on a 7-day clock.

---

## B. Add the five variables to **Preview** only

Each command creates a **Preview-scoped** value and does **not** touch the existing
Production entry of the same name (Vercel stores values per-environment). Run from
the project directory:

```bash
vercel env add GOOGLE_ADS_REFRESH_TOKEN preview   # the NEW token from section A
vercel env add GOOGLE_ADS_CLIENT_SECRET  preview   # same as Production — from the OAuth client
vercel env add GA4_PROPERTY_ID           preview   # 358319621 (not secret)
vercel env add GA4_SA_EMAIL              preview   # client_email from the GA4 service-account key
vercel env add GA4_SA_PRIVATE_KEY        preview   # private_key from the same key file (paste as-is)
```

Get each value **from its original source**, not by extracting Production:
- `GOOGLE_ADS_CLIENT_SECRET` → Google Cloud → Credentials → the OAuth client.
- `GA4_PROPERTY_ID` → literally `358319621`.
- `GA4_SA_EMAIL` / `GA4_SA_PRIVATE_KEY` → the service-account JSON key file
  (`client_email` and `private_key`).

**Dashboard equivalent:** Project → Settings → Environment Variables → **Add New**;
enter the name + value, tick **Preview only** (leave Production unticked), Save. Use
"Add New" (not "Edit" on the Production row) so the Production entry is never modified.

> If you'd rather not re-enter the four identical values, the alternative is to edit
> each existing variable and **add the Preview environment** to it (value stays
> shared, Production value unchanged). This keeps identical values but edits the
> variable's environment scope. The refresh token must still be a **separate Preview
> value** (it differs from Production). The commands above avoid this by keeping
> everything Preview-scoped.

---

## C. Confirm — names/targets only, no values

```bash
vercel env ls
```
Expect all five now listed with **Preview** (in addition to Production). Share back
only that name/target view — no values. Optionally, from a shell that has the vars
loaded, `bash scripts/check-preview-env.sh` prints each as `[SET]`/`[MISSING]`
(never a value).

---

## D. Guardrails

- Adding env vars **does not deploy** and does not change Production values.
- To actually **test** the feeds, a **Preview build** must run so it picks up the new
  vars — that's a separate step and needs the go-ahead (we've been holding off).
- Production configuration and the live dashboard remain untouched throughout.
