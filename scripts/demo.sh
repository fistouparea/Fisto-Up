#!/usr/bin/env bash
# Offline demo on this laptop, one command (no internet needed once installed):
#   scripts/demo.sh            → open http://localhost:4173 (Chrome, phone size: F12 → device toolbar → 360 px)
# Backend: in-memory demo database + seed + recorded real AI answers (backend/src/demo/start.ts, DEMO_MODE).
# Frontend: the production build served by vite preview (built once; rebuilt with REBUILD=1).
# Ctrl+C stops both. Never use this for the real app: DEMO_MODE is refused with NODE_ENV=production.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

if [ "${REBUILD:-0}" = "1" ] || [ ! -f "$root/frontend/dist/index.html" ]; then
  echo "Building the app (one time)…"
  (cd "$root/frontend" && npm run build --silent)
fi

# Stops a process and everything it started (npm → tsx → node, vite), deepest first.
killtree() {
  local child
  for child in $(pgrep -P "$1" 2>/dev/null); do killtree "$child"; done
  kill -TERM "$1" 2>/dev/null || true
}
backend=""
frontend=""
cleanup() {
  trap - EXIT INT TERM
  [ -n "$frontend" ] && killtree "$frontend"
  [ -n "$backend" ] && killtree "$backend"
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "$root/backend" && exec npm run demo --silent) &
backend=$!

echo "Waiting for the demo backend…"
for _ in $(seq 1 120); do
  if curl -fs http://localhost:4000/health >/dev/null 2>&1; then break; fi
  if ! kill -0 $backend 2>/dev/null; then echo "Demo backend stopped – see the error above."; exit 1; fi
  sleep 1
done

(cd "$root/frontend" && exec npx vite preview --port 4173 --strictPort --host) &
frontend=$!
sleep 2
cat <<MSG

  ✅ DEMO READY (offline, recorded real AI answers)
  Laptop:  http://localhost:4173        (all demo PINs 2580)
  Phone:   USB cable → chrome://inspect → Port forwarding 4173 → open http://localhost:4173 on the phone
  Photos:  backend/demo/photos/  (+ backend/seed-assets/handicraft.jpg = "not a plant")
  Stop:    Ctrl+C

MSG
wait $backend
