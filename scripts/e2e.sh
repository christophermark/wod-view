#!/usr/bin/env bash
# Run Maestro e2e flows against the iOS simulator.
#
# Usage:
#   npm run e2e                       # all flows
#   npm run e2e -- .maestro/flows/browse.yaml   # one flow
#
# Prerequisites (checked below):
#   - maestro CLI (https://maestro.mobile.dev)
#   - a booted iOS simulator with the debug app installed (npx expo run:ios)
#   - Metro running (npx expo start)
#
# Screenshots are written to .maestro/screenshots/ (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."

APP_ID=com.christophermark.wodview
FLOWS="${1:-.maestro/flows}"

if ! command -v maestro >/dev/null; then
  echo "error: maestro CLI not found — install from https://maestro.mobile.dev" >&2
  exit 1
fi

# Pick the booted simulator that has the app installed (there may be several booted).
UDID=""
for id in $(xcrun simctl list devices booted | grep -oE '\([0-9A-F-]{36}\)' | tr -d '()'); do
  if xcrun simctl get_app_container "$id" "$APP_ID" >/dev/null 2>&1; then
    UDID="$id"
    break
  fi
done
if [ -z "$UDID" ]; then
  echo "error: no booted simulator has $APP_ID installed. Boot one and run:" >&2
  echo "  xcrun simctl boot 'iPhone 17 Pro' && open -a Simulator && npx expo run:ios" >&2
  exit 1
fi

if ! curl -sf -o /dev/null http://localhost:8081/status; then
  echo "error: Metro is not running on :8081. Run:" >&2
  echo "  npx expo start" >&2
  exit 1
fi

rm -rf .maestro/screenshots
mkdir -p .maestro/screenshots

shift $(($# > 0 ? 1 : 0))
maestro --device "$UDID" test "$FLOWS" "$@"

echo
echo "Screenshots: $(pwd)/.maestro/screenshots/"
ls .maestro/screenshots/ 2>/dev/null || true
