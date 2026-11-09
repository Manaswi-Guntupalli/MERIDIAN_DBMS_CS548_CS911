$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $projectRoot '.local'
$pgCtl = Join-Path $runtimeRoot 'postgresql16/bin/pg_ctl.exe'
$databaseDirectory = Join-Path $runtimeRoot 'postgres-data'
if (-not (Test-Path -LiteralPath $pgCtl)) { throw 'Native PostgreSQL installation is missing from .local/postgresql16.' }
& $pgCtl -D $databaseDirectory status | Out-Null
if ($LASTEXITCODE -ne 0) {
    & $pgCtl -D $databaseDirectory -l (Join-Path $runtimeRoot 'postgres.log') -w start
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL failed to start. Check .local/postgres.log.' }
}
function Test-ServiceUrl([string]$Url) {
    try { return (Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200 }
    catch { return $false }
}
$labDirectory = Join-Path $runtimeRoot 'postgres-lab-data'
if (Test-Path -LiteralPath (Join-Path $labDirectory 'PG_VERSION')) {
    & $pgCtl -D $labDirectory status | Out-Null
    if ($LASTEXITCODE -ne 0) {
        & $pgCtl -D $labDirectory -l (Join-Path $runtimeRoot 'postgres-lab.log') -w start
        if ($LASTEXITCODE -ne 0) { throw 'SQL Lab PostgreSQL failed to start. Check .local/postgres-lab.log.' }
    }
}
$startedProcesses = @{}
$processRecord = Join-Path $runtimeRoot 'started-processes.json'
if (Test-Path -LiteralPath $processRecord) {
    $priorProcesses = Get-Content -LiteralPath $processRecord -Raw | ConvertFrom-Json
    foreach ($entry in $priorProcesses.PSObject.Properties) { $startedProcesses[$entry.Name] = $entry.Value }
}
if (-not (Test-ServiceUrl 'http://127.0.0.1:4000/api/health')) {
    $startedProcesses.api = (Start-Process -FilePath (Get-Command node).Source -ArgumentList 'dist/src/index.js' -WorkingDirectory (Join-Path $projectRoot 'server') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeRoot 'api.log') -RedirectStandardError (Join-Path $runtimeRoot 'api-error.log') -PassThru).Id
}
if (-not (Test-ServiceUrl 'http://127.0.0.1:5173')) {
    $nextEntry = Join-Path $projectRoot 'node_modules/next/dist/bin/next'
    $startedProcesses.website = (Start-Process -FilePath (Get-Command node).Source -ArgumentList ('"' + $nextEntry + '" start --hostname 0.0.0.0 --port 5173') -WorkingDirectory (Join-Path $projectRoot 'client') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeRoot 'website.log') -RedirectStandardError (Join-Path $runtimeRoot 'website-error.log') -PassThru).Id
}
foreach ($engine in @(@{Name='analytics';Port=8010;Directory='intelligence';App='app.main:app'},@{Name='face';Port=8020;Directory='faceservice';App='app:api'})) {
    if (-not (Test-ServiceUrl "http://127.0.0.1:$($engine.Port)/health")) {
        $startedProcesses[$engine.Name] = (Start-Process -FilePath (Get-Command python).Source -ArgumentList @('-m','uvicorn',$engine.App,'--host','127.0.0.1','--port',"$($engine.Port)") -WorkingDirectory (Join-Path $projectRoot $engine.Directory) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeRoot "$($engine.Name).log") -RedirectStandardError (Join-Path $runtimeRoot "$($engine.Name)-error.log") -PassThru).Id
    }
}
$startedProcesses | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimeRoot 'started-processes.json')
Write-Output 'Native services started. Run npm run check:services after the face model warms up.'
Write-Output 'Website: http://localhost:5173'
