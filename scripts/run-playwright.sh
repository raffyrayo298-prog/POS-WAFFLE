#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "Starting static server on port 60355 in background"
python -m http.server 60355 &
SERVER_PID=$!
sleep 1

trap 'echo "Stopping server"; kill $SERVER_PID 2>/dev/null || true' EXIT

echo "Installing npm dependencies"
npm install

echo "Installing Playwright browsers"
npx playwright install

echo "Running Playwright tests"
npx playwright test --reporter=line
