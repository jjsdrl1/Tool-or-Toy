#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting backend..."
cd "$ROOT_DIR/backend"
mvn spring-boot:run &
BACKEND_PID=$!

echo "Starting frontend..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID  Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both processes."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
