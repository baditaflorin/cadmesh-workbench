#!/bin/sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

make build

LOG_FILE="${TMPDIR:-/tmp}/cadmesh-pages-preview.log"
npm run preview -- --host 127.0.0.1 --port 4173 >"$LOG_FILE" 2>&1 &
SERVER_PID="$!"

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

i=0
until curl -fsS http://127.0.0.1:4173/cadmesh-workbench/ >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    cat "$LOG_FILE"
    exit 1
  fi
  sleep 0.5
done

npx playwright test

