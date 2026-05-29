#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Color helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Prerequisite checks ───────────────────────────────────────────────────────
info "Checking prerequisites..."

command -v java  >/dev/null 2>&1 || error "Java not found. Install JDK 17+."
command -v mvn   >/dev/null 2>&1 || error "Maven not found. Install Maven 3.8+."
command -v node  >/dev/null 2>&1 || error "Node.js not found. Install Node 18+."
command -v npm   >/dev/null 2>&1 || error "npm not found."

JAVA_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d. -f1)
[[ "$JAVA_VER" -ge 17 ]] 2>/dev/null || warn "Java $JAVA_VER detected, Java 17+ recommended."

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[[ "$NODE_VER" -ge 18 ]] 2>/dev/null || warn "Node $NODE_VER detected, Node 18+ recommended."

# ── Local config check ────────────────────────────────────────────────────────
LOCAL_CFG="$ROOT_DIR/config/application-local.yml"
if [[ ! -f "$LOCAL_CFG" ]]; then
    warn "Local config not found: config/application-local.yml"
    warn "Copy the example and fill in your settings:"
    warn "  cp config/application-local.yml.example config/application-local.yml"
    error "Aborting — local config is required."
fi

# ── Frontend dependencies ─────────────────────────────────────────────────────
if [[ ! -d "$ROOT_DIR/frontend/node_modules" ]]; then
    info "Installing frontend dependencies..."
    (cd "$ROOT_DIR/frontend" && npm install)
fi

# ── Start services ────────────────────────────────────────────────────────────
info "Starting backend  (http://localhost:8081) ..."
(cd "$ROOT_DIR/backend" && mvn spring-boot:run -q) &
BACKEND_PID=$!

info "Starting frontend (http://localhost:5173) ..."
(cd "$ROOT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
info "Both services are starting."
info "  Backend  → http://localhost:8081"
info "  Frontend → http://localhost:5173"
echo ""
info "Press Ctrl+C to stop all processes."

trap "info 'Shutting down...'; kill \$BACKEND_PID \$FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
