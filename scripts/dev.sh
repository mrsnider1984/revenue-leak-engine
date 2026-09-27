#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if lsof -nP -iTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Jac already listening on 8000"
else
  .venv/bin/jac start jac/opportunity.jac --no_client --port 8000 &
  echo $! > /tmp/revenue-leak-jac.pid
fi
cd frontend
npm run dev
