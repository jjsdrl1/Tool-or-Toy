$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting backend..."
$backend = Start-Process -FilePath "mvn" -ArgumentList "spring-boot:run" `
    -WorkingDirectory "$Root\backend" -PassThru -NoNewWindow

Write-Host "Starting frontend..."
$frontend = Start-Process -FilePath "npm" -ArgumentList "run","dev" `
    -WorkingDirectory "$Root\frontend" -PassThru -NoNewWindow

Write-Host "Backend PID: $($backend.Id)  Frontend PID: $($frontend.Id)"
Write-Host "Press Ctrl+C to stop both processes."

try {
    Wait-Process -Id $backend.Id, $frontend.Id
} finally {
    Stop-Process -Id $backend.Id, $frontend.Id -Force -ErrorAction SilentlyContinue
}
