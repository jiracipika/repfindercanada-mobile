#!/bin/bash
# Trigger Codemagic `release-both` (iOS → TestFlight + Android → Play internal)
# and poll until it finishes.
#
# Usage:
#   CM_API_TOKEN=xxxx scripts/trigger-codemagic-release.sh
#   scripts/trigger-codemagic-release.sh <token>
#
# Everything the build needs (keystore, ASC key, Play service account) is stored
# in Codemagic env groups — this only needs a personal API token
# (Codemagic → Settings → Integrations → Personal API tokens).

set -euo pipefail

TOKEN="${1:-${CM_API_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
  echo "ERROR: pass a Codemagic API token: CM_API_TOKEN=... $0" >&2
  exit 1
fi

API="https://api.codemagic.io"
BRANCH="${BRANCH:-main}"
WORKFLOW="${WORKFLOW:-release-both}"

echo "== Listing Codemagic apps =="
APPS=$(curl -sf -H "x-auth-token: $TOKEN" "$API/api/apps")
echo "$APPS" | python3 -c "
import json, sys
apps = json.load(sys.stdin).get('apps', [])
for a in apps:
    print(a.get('_id'), a.get('appName'), a.get('repository'), sep=' | ')
"
APP_ID=$(echo "$APPS" | python3 -c "
import json, sys
apps = json.load(sys.stdin).get('apps', [])
match = [a for a in apps if 'repfindercanada' in (a.get('repository') or '')]
if not match:
    sys.exit('no app matching repfindercanada — pick an _id from the list above')
print(match[0]['_id'])
")

echo "== Starting build: app=$APP_ID workflow=$WORKFLOW branch=$BRANCH =="
BUILD=$(curl -sf -X POST -H "x-auth-token: $TOKEN" -H "Content-Type: application/json" \
  -d "{\"appId\": \"$APP_ID\", \"workflowId\": \"$WORKFLOW\", \"branch\": \"$BRANCH\"}" \
  "$API/api/builds")
BUILD_ID=$(echo "$BUILD" | python3 -c "import json,sys; print(json.load(sys.stdin).get('_id',''))")
if [ -z "$BUILD_ID" ]; then
  echo "ERROR: unexpected response:" >&2
  echo "$BUILD" >&2
  exit 1
fi
echo "Build started: $BUILD_ID"
echo "Dashboard: https://codemagic.io/builds/$BUILD_ID"

echo "== Polling (every 60s) =="
while true; do
  sleep 60
  STATUS=$(curl -sf -H "x-auth-token: $TOKEN" "$API/api/builds/$BUILD_ID")
  STATE=$(echo "$STATUS" | python3 -c "
import json, sys
b = json.load(sys.stdin).get('builds', [{}])[0] if 'builds' in json.load(open('/dev/null')) else json.load(sys.stdin)
print(b.get('status', 'unknown'))
" 2>/dev/null || echo unknown)
  echo "$(date +%H:%M:%S) status: $STATE"
  case "$STATE" in
    finished|success)
      echo "== BUILD SUCCEEDED =="
      echo "iOS → TestFlight and Android → Play internal are publishing automatically."
      exit 0
      ;;
    failed|error|canceled)
      echo "== BUILD FAILED — check the dashboard link above =="
      exit 1
      ;;
  esac
done
