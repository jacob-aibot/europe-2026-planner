$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskNodeCommand = Get-Command node -ErrorAction SilentlyContinue
$taskNode = if ($taskNodeCommand) { $taskNodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $taskNode)) { throw 'Node.js is unavailable. Install Node 24 or open this workspace in Codex.' }
Push-Location -LiteralPath $taskRoot
try {
    & $taskNode tools/gen-sample.mjs
    if ($LASTEXITCODE -ne 0) { throw 'The example could not be generated. Preview was not started.' }
    & $taskNode node_modules/vite/bin/vite.js build apps/web --config apps/web/vite.config.ts --logLevel warn
    if ($LASTEXITCODE -ne 0) { throw 'The build failed. Preview was not started.' }
    $taskExisting = $null
    try { $taskExisting = Invoke-WebRequest -Uri 'http://127.0.0.1:5175/' -TimeoutSec 2 -UseBasicParsing } catch { }
    if ($taskExisting -and $taskExisting.Content -match '<title>Cairn</title>') {
        Write-Host 'Cairn is already running on port 5175; its production files have been updated.'
        Write-Host 'Keep the existing preview terminal open. Use the laptop Wi-Fi address with :5175 on your phone.'
    } else {
        Write-Host 'Keep this terminal open and the laptop awake. Open the Network URL below on the same Wi-Fi.'
        & $taskNode node_modules/vite/bin/vite.js preview apps/web --config apps/web/vite.config.ts
        if ($LASTEXITCODE -ne 0) { throw 'Preview could not start. Port 5175 must be available.' }
    }
} finally { Pop-Location }
