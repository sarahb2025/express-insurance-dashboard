# Final visual / data validation checklist (protected Preview)

Do this on the protected Vercel Preview while logged into Vercel — nothing is merged
or promoted. Endpoints already return 200; this pass confirms the **page renders the
live data correctly** and the **numbers are right**.

Open the **July report**: `…/reports/2026-07/` (pass Vercel SSO, then the report's
shared password). Set the period to **July 2026** (the report's default). Optionally
also spot-check the master root `/` (defaults to June).

> Read the **feed-status pills**, not just "are there numbers" — the page shows
> reference/placeholder content until a feed responds, so a pill is the true signal.

## 1. Feed-status pills — all should read "live"
- [ ] **Performance Overview** → `Feed: live · Google Ads`
- [ ] **Performance Max & Asset Group Overview** → `Feed: live · Google Ads`
- [ ] **Landing Page Performance** → `Feed: live · GA4 (property 387516214)`
- [ ] None reads `static …unavailable` or `Awaiting …`.

## 2. KPI band (Google Ads)
- [ ] Account ROAS, Non-brand ROAS, Best Campaign + ROAS, PMax ROAS, Total Conv. Value all populated (no `—`).
- [ ] Values plausible (ROAS roughly 1–6; conv value in $k). **Non-brand ROAS = all campaigns except Brand.**
- [ ] Monthly Budget shows **$18K** (fixed); Target ROAS `2.0+` (static).

## 3. Performance stat cards (Google Ads)
- [ ] Impressions, Clicks, Conversions, Conv. Value, **Spend**, Avg. CPC all populated.
- [ ] Cross-check each against the **Google Ads UI → Campaigns**, 1–31 Jul 2026.

## 4. Campaign table (Google Ads)
- [ ] One row per **active** campaign (Brand, Performance Max, Professional Indemnity, Accountant Insurance, Public Liability, + the new **Management Consultants** if it ran). No paused/zero rows.
- [ ] Spend / Conversions / CPA / Conv. Value / ROAS populated; ROAS bars render.
- [ ] Totals reconcile with the Google Ads UI for the month.

## 5. PMax asset groups (Google Ads)
- [ ] Table shows real asset-group rows (e.g. Accountants, General, IT Contractors, Management Consultants) — **not** the "Awaiting Google Ads asset-group report" row.
- [ ] Spend / Conversions / Conv. Value / ROAS populated per group.
- [ ] Cross-check vs the Google Ads **PMax campaign → Asset groups** report.

## 6. Geography (Google Ads — source of truth) ⚠️ key check
- [ ] Bars + city table populated; "vs prev." column filled (June compare).
- [ ] **Conversions are in the expected Google Ads range — tens, NOT the GA4 hundreds.** (This is the Slide-7 fix: earlier the live site showed GA4 geo like Melbourne 457 / Sydney 430; Google Ads should read in the low tens.)
- [ ] Top cities/states match the Google Ads **Locations (User location)** report for July.

## 7. GA4 landing-page cards (GA4 only)
- [ ] All four channel cards — Cross-network, Paid Search, Direct, Organic — show Sessions / Key Events / Conv. Rate / Bounce / Avg. Engagement (no `—`).
- [ ] Cross-check vs the **GA4 UI** for the accountants landing page, July (Paid Search + Cross-network sessions ≈ the ~160 referenced in the commentary is a useful sanity anchor).

## 8. Commentary (Kirsten — manual) — should already be present
- [ ] PMax, Geography, and Landing-page blue ℹ️ boxes show the July commentary text.

## 9. Source labelling
- [ ] Legend under the KPI band; each section has its source chip(s).

## 10. Behaviour & polish
- [ ] Switch the month dropdown / Last 30 / Custom → feeds re-fetch for the new range.
- [ ] No browser console errors.
- [ ] Narrow the window (mobile width) → sections stack, no horizontal page scroll.

## Intentional — do NOT flag these as failures
- **Budget split**: shows the fixed **$18,000/month** with "split populated at month-end (Looker)" — real split only appears once entered.
- **LTV & ROAS / LOB**: shows the dated **"as at May 2026"** figures until a newer LOB refresh is supplied.

---

### Pass criteria
All three feed pills **live**; sections 2–7 populated with real Google Ads / GA4
numbers that reconcile with the respective UIs; geography in the Google-Ads range
(tens); no console errors. Then it's ready for a Production go-live decision (a
separate, explicit step — not done here).
