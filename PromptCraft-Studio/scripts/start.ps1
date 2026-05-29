#Requires -Version 5.1
<#
.SYNOPSIS
    Start PromptCraft Studio (backend + frontend).
.DESCRIPTION
    Checks prerequisites, verifies local config exists, then launches
    the Spring Boot backend (:8081) and Vite dev server (:5173) in parallel.
    Press Ctrl+C to stop both processes.
#>

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

function Write-Info  { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Green  }
function Write-Warn  { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Err   { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

# ── Prerequisite checks ───────────────────────────────────────────────────────
Write-Info "Checking prerequisites..."

if (-not (Get-Command java  -ErrorAction SilentlyContinue)) { Write-Err "Java not found. Install JDK 17+." }
if (-not (Get-Command mvn   -ErrorAction SilentlyContinue)) { Write-Err "Maven not found. Install Maven 3.8+." }
if (-not (Get-Command node  -ErrorAction SilentlyContinue)) { Write-Err "Node.js not found. Install Node 18+." }
if (-not (Get-Command npm   -ErrorAction SilentlyContinue)) { Write-Err "npm not found." }

$javaVer = (java -version 2>&1 | Select-String 'version' | ForEach-Object { $_ -replace '.*"(\d+).*".*','$1' }) -as [int]
if ($javaVer -lt 17) { Write-Warn "Java $javaVer detected, Java 17+ recommended." }

$nodeVer = (node -e "process.stdout.write(process.versions.node.split('.')[0])") -as [int]
if ($nodeVer -lt 18) { Write-Warn "Node $nodeVer detected, Node 18+ recommended." }

# ── Local config check ────────────────────────────────────────────────────────
$localCfg = "$Root\config\application-local.yml"
if (-not (Test-Path $localCfg)) {
    Write-Warn "Local config not found: config\application-local.yml"
    Write-Warn "Copy the example and fill in your settings:"
    Write-Warn "  Copy-Item config\application-local.yml.example config\application-local.yml"
    Write-Err  "Aborting — local config is required."
}

# ── Frontend dependencies ─────────────────────────────────────────────────────
if (-not (Test-Path "$Root\frontend\node_modules")) {
    Write-Info "Installing frontend dependencies..."
    Push-Location "$Root\frontend"
    npm install
    Pop-Location
}

# ── Start services ────────────────────────────────────────────────────────────
Write-Info "Starting backend  (http://localhost:8081) ..."
$backend = Start-Process -FilePath "mvn" -ArgumentList "spring-boot:run" `
    -WorkingDirectory "$Root\backend" -PassThru -NoNewWindow

Write-Info "Starting frontend (http://localhost:5173) ..."
$frontend = Start-Process -FilePath "npm" -ArgumentList "run","dev" `
    -WorkingDirectory "$Root\frontend" -PassThru -NoNewWindow

Write-Host ""
Write-Info "Both services are starting."
Write-Info "  Backend  -> http://localhost:8081"
Write-Info "  Frontend -> http://localhost:5173"
Write-Host ""
Write-Info "Press Ctrl+C to stop all processes."

try {
    Wait-Process -Id $backend.Id, $frontend.Id
} finally {
    Stop-Process -Id $backend.Id, $frontend.Id -Force -ErrorAction SilentlyContinue
    Write-Info "All processes stopped."
}
