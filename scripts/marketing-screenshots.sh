#!/usr/bin/env bash
# Regenerate the App Store marketing screenshots.
#
# Usage:  npm run screenshots
# Output: .maestro/marketing/out/*.png  (exact App Store 6.9" sizes)
#
# Prerequisites (checked below):
#   - maestro CLI
#   - a booted 6.9"-class simulator (iPhone 17 Pro Max) with the debug app
#     installed (npx expo run:ios)
#   - Metro running (npx expo start)
#
# How it stays clean: the dev app boots on the bundled dataset, which on this
# machine is Chris's personal history — never allowed in marketing material.
# So the run temporarily overwrites src/data/workouts.json with the committed
# synthetic sample (identical to preview-workouts.json, both generated from
# data/workouts.sample.csv), takes the shots without any preview banner, and
# restores the real file via `npm run convert` on exit — even on failure.
set -euo pipefail
cd "$(dirname "$0")/.."

APP_ID=com.christophermark.wodview

if ! command -v maestro >/dev/null; then
  echo "error: maestro CLI not found — install from https://maestro.mobile.dev" >&2
  exit 1
fi

# Pick a booted simulator that has the app installed, preferring a 6.9"-class
# device (Pro Max) so the shots come out at an App-Store-accepted size — the
# post-processor rejects anything else.
UDID=""
FALLBACK=""
while IFS= read -r line; do
  id=$(grep -oE '\([0-9A-F-]{36}\)' <<<"$line" | tr -d '()') || continue
  [ -n "$id" ] || continue
  if xcrun simctl get_app_container "$id" "$APP_ID" >/dev/null 2>&1; then
    if [[ "$line" == *"Pro Max"* ]]; then
      UDID="$id"
      break
    fi
    FALLBACK="${FALLBACK:-$id}"
  fi
done < <(xcrun simctl list devices booted)
UDID="${UDID:-$FALLBACK}"
if [ -z "$UDID" ]; then
  echo "error: no booted simulator has $APP_ID installed. For store-accepted" >&2
  echo "6.9\" sizes, boot an iPhone 17 Pro Max and run: npx expo run:ios" >&2
  exit 1
fi

if ! curl -sf -o /dev/null http://localhost:8081/status; then
  echo "error: Metro is not running on :8081. Run: npx expo start" >&2
  exit 1
fi

restore() {
  npm run --silent convert >/dev/null
  xcrun simctl status_bar "$UDID" clear || true
}
trap restore EXIT

# Swap the bundled dataset to the synthetic sample for the duration of the run.
cp src/data/preview-workouts.json src/data/workouts.json

# Marketing-grade status bar: 9:41, full battery, full signal.
xcrun simctl status_bar "$UDID" override \
  --time "9:41" --batteryState charged --batteryLevel 100 \
  --wifiBars 3 --cellularBars 4

rm -rf .maestro/marketing/raw .maestro/marketing/out
mkdir -p .maestro/marketing/raw

maestro --device "$UDID" test .maestro/marketing/flows

# Verify dimensions against Apple's accepted 6.9" sizes, strip alpha, and
# write the numbered store set.
npx tsx scripts/process-marketing-screenshots.ts

echo
echo "Store-ready screenshots: $(pwd)/.maestro/marketing/out/"
ls .maestro/marketing/out/
