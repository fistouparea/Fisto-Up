#!/usr/bin/env bash
# Every gate before a commit, for both apps: type-check, lint, unit/API tests, build. Stops at the first failure.
#   scripts/check-all.sh          (the Playwright journeys run separately: cd frontend && npm run e2e)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

cd "$root/backend"
npx tsc --noEmit
npx eslint . --max-warnings=0
npm test --silent
npm run build --silent

cd "$root/frontend"
npx tsc -b
npx eslint . --max-warnings=0
npm test --silent
npm run build --silent > /dev/null

echo "ALL CHECKS PASSED"
