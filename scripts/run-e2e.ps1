#requires -Version 5.1
<#
.SINOPSIS
    Ejecuta las pruebas E2E de Playwright contra una base aislada.

.DESCRIPCIÓN
    1) Reinicia hotel_lockers_test desde la base de desarrollo (datos demo).
    2) Arranca PHP en un puerto de pruebas con DB_NAME=hotel_lockers_test.
    3) Ejecuta Playwright (Chrome/Edge del sistema).
    4) Detiene el servidor siempre, incluso si hay fallos.

.NOTAS
    No toca la base de desarrollo ni datos reales. No instala dependencias.
#>
[CmdletBinding()]
param(
    [int]$Port = 8001,
    [string]$Browser = 'chromium',
    [string]$TestDb = 'hotel_lockers_test',
    [switch]$SkipReset
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$public = Join-Path $root 'public'

function Test-TcpPort([string]$TargetHost, [int]$TargetPort, [int]$TimeoutMs = 500) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $task = $client.ConnectAsync($TargetHost, $TargetPort)
        return ($task.Wait($TimeoutMs) -and $client.Connected)
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

$php = Get-Command php -ErrorAction SilentlyContinue
if ($php) { $phpPath = $php.Source }
elseif (Test-Path 'C:\xampp\php\php.exe') { $phpPath = 'C:\xampp\php\php.exe' }
else { throw 'PHP no encontrado.' }

if (Test-TcpPort '127.0.0.1' $Port 500) {
    throw "El puerto $Port ya esta en uso. Deten el servidor anterior o usa -Port."
}

if (-not $SkipReset) {
    & (Join-Path $PSScriptRoot 'setup-test-db.ps1') -TestDb $TestDb
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la preparacion de la base de pruebas.' }
}

$throttle = Join-Path $root 'private\runtime\login-throttle.json'
if (Test-Path $throttle) { Remove-Item $throttle -Force }

$previousDbName = $env:DB_NAME
$previousBaseUrl = $env:PLAYWRIGHT_BASE_URL
$env:DB_NAME = $TestDb
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:$Port"

$process = Start-Process -FilePath $phpPath `
    -ArgumentList @('-S', "127.0.0.1:$Port", '-t', $public) `
    -WorkingDirectory $root -PassThru -WindowStyle Hidden

$exitCode = 1
try {
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/login.php" -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { }
        Start-Sleep -Milliseconds 250
    }
    if (-not $ready) { throw 'El servidor PHP de pruebas no respondio.' }

    Push-Location $root
    try {
        Write-Host "Playwright contra $env:PLAYWRIGHT_BASE_URL (base $TestDb)" -ForegroundColor Cyan
        & npx playwright test --config=tests/playwright.config.js --project=$Browser 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
} finally {
    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    if ($null -eq $previousDbName) { Remove-Item Env:DB_NAME -ErrorAction SilentlyContinue }
    else { $env:DB_NAME = $previousDbName }
    if ($null -eq $previousBaseUrl) { Remove-Item Env:PLAYWRIGHT_BASE_URL -ErrorAction SilentlyContinue }
    else { $env:PLAYWRIGHT_BASE_URL = $previousBaseUrl }
}

if ($exitCode -eq 0) {
    Write-Host 'E2E: TODAS LAS PRUEBAS PASARON' -ForegroundColor Green
} else {
    Write-Host "E2E: PRUEBAS FALLIDAS (codigo $exitCode)" -ForegroundColor Red
}
exit $exitCode
