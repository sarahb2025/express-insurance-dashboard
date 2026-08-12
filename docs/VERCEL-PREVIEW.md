# Vercel Preview configuration (no Production changes)

Purpose: stand up a **Preview** deployment of this branch with the Google Ads +
GA4 feeds, validate it, and be able to roll back — **without** touching
Production, merging, opening a PR, or putting secrets in the repo.

> **Guardrails baked into this doc:** every command targets **Preview only**.
> Nothing here writes Production env vars or promotes to Production. Values are
> entered at interactive prompts / the dashboard — never in a file, commit, or log.

---

## 0. Existing project env vars — name/status only

**I cannot read the Vercel project's env vars from this environment** (no Vercel
access here), and I will not guess values. What can be **inferred from the live
endpoints' behavior** (evidence only, not the secret store):

| Capability | Inferred status | Evidence |
|---|---|---|
| GA4 property + service-account credential | **Present & valid** | `/api/ga4-geo` returns live data incl. `propertyId: 358319621` |
| Google Ads OAuth client (id + secret) + refresh token | **Present but refresh token INVALID** | `/api/ads-report` → `invalid_grant` (a refresh was attempted and rejected) |
| Google Ads developer token / customer id | **Unknown** | `invalid_grant` occurs before these are used, so behavior reveals nothing |

Two caveats: (1) the **live deployment runs the old single-file code**, so its
env-var **names may differ** from this repo's; the new code needs vars named as in
§1. (2) To confirm names/targets authoritatively **without values**, someone with
Vercel access runs:

```bash
vercel env ls          # lists NAME, TARGET (Production/Preview/Development), CREATED — no values
```

Share that name/target list back and I'll map it to §1. Do **not** paste any
values.

---

## 1. Environment-variable checklist — add to **Preview** only

Add each to the **Preview** environment (leave Production untouched). Owners are in
`docs/CREDENTIALS-AND-ACCESS.md`.

| # | Variable | Required | Notes |
|---|----------|:---:|-------|
| 1 | `GA4_PROPERTY_ID` | ✅ | `358319621` (not secret) |
| 2 | `GOOGLE_SERVICE_ACCOUNT_JSON` | ✅ | SA key JSON (raw or base64); SA has **Viewer** on the GA4 property |
| 3 | `GOOGLE_ADS_DEVELOPER_TOKEN` | ✅ | from the MCC (API Center) |
| 4 | `GOOGLE_ADS_CLIENT_ID` | ✅ | OAuth client |
| 5 | `GOOGLE_ADS_CLIENT_SECRET` | ✅ | OAuth client |
| 6 | `GOOGLE_ADS_REFRESH_TOKEN` | ✅ | **the regenerated token** (old one is `invalid_grant`) |
| 7 | `GOOGLE_ADS_CUSTOMER_ID` | ✅ | digits only, no dashes |
| 8 | `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | ⬜ | only if accessed via an MCC |
| 9 | `GOOGLE_ADS_CAMPAIGN_MAP` | ⬜ | JSON name→key map, only if live names differ from the heuristic |

These nine cover **all four** Google Ads endpoints (`ads-report`, `ads-geo`,
`ads-asset-groups`) and the GA4 endpoint (`ga4-landing-page`) — no per-endpoint
extras.

### Add them safely (values entered at the prompt, never stored here)
```bash
# CLI — repeat per variable; 'preview' scopes it to Preview ONLY
vercel env add GA4_PROPERTY_ID preview
vercel env add GOOGLE_SERVICE_ACCOUNT_JSON preview
vercel env add GOOGLE_ADS_DEVELOPER_TOKEN preview
# ...through the list above
```
Or in the dashboard: **Project → Settings → Environment Variables → Add → tick
*Preview* only**.

Check presence locally (name + SET/MISSING, never values):
```bash
bash scripts/check-preview-env.sh
```

---

## 2. Build a Preview deployment (NOT Production)

```bash
npm install                 # installs @google-analytics/data + google-ads-api
vercel                      # creates a PREVIEW deployment; prints a unique preview URL
# NEVER run 'vercel --prod' here.
```
> If the project has Git auto-deploys enabled, pushing this branch may already
> create a Preview automatically. That is Preview, not Production — safe — but the
> feeds only work once the Preview env vars above are set.

---

## 3. Validate the Preview (before anyone considers Production)

Let `PREVIEW=https://<your-preview-url>`.

```bash
# a) Offline unit test (no creds)
node scripts/test-asset-groups.js

# b) Each live endpoint: 200 + JSON = good; 501 = env missing; 500 = auth/API error
curl -s "$PREVIEW/api/ads-report?start=2026-07-01&end=2026-07-31"        | jq '.kpi, (.campaigns|length)'
curl -s "$PREVIEW/api/ads-asset-groups?start=2026-07-01&end=2026-07-31"  | jq '.assetGroups'
curl -s "$PREVIEW/api/ads-geo?start=2026-07-01&end=2026-07-31"           | jq '.locations[:3]'
curl -s "$PREVIEW/api/ga4-landing-page?start=2026-07-01&end=2026-07-31"  | jq '.channels'
```

**Parity + acceptance checks**
- [ ] Google Ads conversions / cost / value / ROAS match the Google Ads UI for the range.
- [ ] Geography reads **Google Ads** numbers (tens), **not** GA4 (hundreds) — the Slide-7 fix.
- [ ] GA4 landing-page sessions/engagement match the GA4 UI.
- [ ] In the dashboard (Preview URL) the feed pills flip to **live**; placeholders fill; only the intended placeholders remain (budget split until month-end).
- [ ] No secrets in the repo; vars exist only in Vercel Preview.

---

## 4. Rollback / teardown (Production stays as-is throughout)

Preview is isolated from Production, so there is nothing to undo in Production. To
clean up a Preview:

```bash
# Remove Preview-scoped env vars (does NOT affect Production)
vercel env rm GOOGLE_ADS_REFRESH_TOKEN preview
# ...repeat per variable you added

# Remove a specific preview deployment (optional; previews also expire on their own)
vercel remove <preview-deployment-url>
```

Safety notes:
- **Never** ran against Production, so the live dashboard is unchanged.
- If a Preview were ever accidentally promoted, `vercel rollback` restores the
  previous Production deployment; Production env vars were never modified.
- The claude.ai private review link is separate from Vercel and is unaffected.

---

## 5. What's still blocking a green Preview
Only credentials: primarily the **regenerated `GOOGLE_ADS_REFRESH_TOKEN`** plus
the other Google Ads vars, and `GOOGLE_SERVICE_ACCOUNT_JSON` with GA4 Viewer.
Once those are in Preview, run §3 and everything goes live except the budget split
(supplied from Looker at month-end).
