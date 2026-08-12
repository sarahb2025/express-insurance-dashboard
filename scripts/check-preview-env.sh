#!/usr/bin/env bash
# Reports which required feed env vars are present — NAME + SET/MISSING only.
# It NEVER prints a value. Checks the current environment and, if present, a
# local .env (git-ignored). Use before `vercel dev` or to sanity-check a shell
# populated via `vercel env pull`.
set -u

REQUIRED=(GA4_PROPERTY_ID \
  GOOGLE_ADS_DEVELOPER_TOKEN GOOGLE_ADS_CLIENT_ID GOOGLE_ADS_CLIENT_SECRET \
  GOOGLE_ADS_REFRESH_TOKEN GOOGLE_ADS_CUSTOMER_ID)
OPTIONAL=(GOOGLE_ADS_LOGIN_CUSTOMER_ID GOOGLE_ADS_CAMPAIGN_MAP)

# Is NAME set to a non-empty value in the environment or the .env file? (no value printed)
is_set() {
  local v="$1"
  [ -n "${!v:-}" ] && return 0
  [ -f .env ] && grep -qE "^[[:space:]]*${v}=..*" .env && return 0
  return 1
}

miss=0
echo "Required feed variables:"
for v in "${REQUIRED[@]}"; do
  if is_set "$v"; then echo "  [SET]     $v"; else echo "  [MISSING] $v"; miss=$((miss + 1)); fi
done
# GA4 service-account credential: satisfied by the reused pair OR a JSON blob OR a key-file path
if { is_set GA4_SA_EMAIL && is_set GA4_SA_PRIVATE_KEY; } || is_set GOOGLE_SERVICE_ACCOUNT_JSON || is_set GOOGLE_APPLICATION_CREDENTIALS; then
  echo "  [SET]     GA4 service account (GA4_SA_EMAIL+GA4_SA_PRIVATE_KEY | GOOGLE_SERVICE_ACCOUNT_JSON | GOOGLE_APPLICATION_CREDENTIALS)"
else
  echo "  [MISSING] GA4 service account (need GA4_SA_EMAIL+GA4_SA_PRIVATE_KEY, or GOOGLE_SERVICE_ACCOUNT_JSON)"
  miss=$((miss + 1))
fi
echo "Optional:"
for v in "${OPTIONAL[@]}"; do
  if is_set "$v"; then echo "  [SET]     $v"; else echo "  [ - ]     $v"; fi
done
echo ""
if [ "$miss" -gt 0 ]; then
  echo "$miss required variable(s) missing — feeds will return HTTP 501 until set (dashboard stays on placeholders)."
  exit 1
else
  echo "All required feed variables present."
fi
