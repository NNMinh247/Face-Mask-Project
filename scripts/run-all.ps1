# Start server and client in two new PowerShell windows
$repoRoot = Split-Path -Parent $PSScriptRoot
$serverScript = Join-Path $PSScriptRoot 'run-server.ps1'
$clientScript = Join-Path $PSScriptRoot 'run-client.ps1'

Start-Process -FilePath powershell -ArgumentList "-NoExit -ExecutionPolicy Bypass -Command \"& '$serverScript'\""
Start-Sleep -Seconds 1
Start-Process -FilePath powershell -ArgumentList "-NoExit -ExecutionPolicy Bypass -Command \"& '$clientScript'\""

Write-Host "Đã mở server và client trong hai cửa sổ PowerShell mới."
