#requires -Version 5.1
<#
.SINOPSIS
    Ejecuta validaciones de calidad y, opcionalmente, las pruebas E2E.

.DESCRIPCIÓN
    - php -l sobre todos los archivos PHP del proyecto.
    - node --check sobre el JavaScript propio.
    - Con -E2E: base aislada + servidor PHP + Playwright (run-e2e.ps1).
    No ejecuta pruebas destructivas ni sobre datos reales.
#>
[CmdletBinding()]
param(
    [switch]$SkipPhp,
    [switch]$SkipPlaywright,
    [switch]$E2E,
    [string]$Browser = 'chromium'
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$failed = $false

$php = Get-Command php -ErrorAction SilentlyContinue
if ($php) { $phpPath = $php.Source }
elseif (Test-Path 'C:\xampp\php\php.exe') { $phpPath = 'C:\xampp\php\php.exe' }
else { $phpPath = $null }

Write-Host "=== Ejecucion de pruebas: Grand Sirenis Locker App ===" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# --- PHP syntax ---
if (-not $SkipPhp) {
    Write-Host "--- Sintaxis PHP (php -l) ---" -ForegroundColor Yellow
    if (-not $phpPath) {
        Write-Host "PHP no disponible. Saltando validacion." -ForegroundColor Red
        $failed = $true
    } else {
        $phpFiles = Get-ChildItem -Recurse -Filter *.php -Path $root | Where-Object {
            $_.FullName -notlike '*node_modules*' -and $_.FullName -notlike '*tests\results*'
        }
        $phpOk = 0; $phpFail = 0
        foreach ($f in $phpFiles) {
            $result = & $phpPath -l $f.FullName 2>&1
            if ($result -match 'No syntax errors') {
                $phpOk++
            } else {
                $phpFail++
                $failed = $true
                Write-Host "  FALLO: $($f.Name)" -ForegroundColor Red
                Write-Host "    $result" -ForegroundColor Red
            }
        }
        Write-Host "PHP: $phpOk exitosos, $phpFail fallidos" -ForegroundColor Gray
        Write-Host ""
    }
}

# --- JavaScript syntax ---
Write-Host "--- Sintaxis JavaScript (node --check) ---" -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "Node.js no disponible. Saltando validacion JS." -ForegroundColor Yellow
} else {
    $jsFiles = Get-ChildItem -Path (Join-Path $root 'public\assets\js') -Filter *.js -ErrorAction SilentlyContinue
    $jsOk = 0; $jsFail = 0
    foreach ($f in $jsFiles) {
        & node --check $f.FullName 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { $jsOk++ }
        else { $jsFail++; $failed = $true; Write-Host "  FALLO: $($f.Name)" -ForegroundColor Red }
    }
    Write-Host "JS: $jsOk exitosos, $jsFail fallidos" -ForegroundColor Gray
}
Write-Host ""

# --- Playwright ---
if (-not $SkipPlaywright) {
    if ($E2E) {
        Write-Host "--- Playwright E2E (base aislada) ---" -ForegroundColor Yellow
        & (Join-Path $PSScriptRoot 'run-e2e.ps1') -Browser $Browser
        if ($LASTEXITCODE -ne 0) { $failed = $true }
    } else {
        Write-Host "Playwright no ejecutado. Usa -E2E para base aislada hotel_lockers_test." -ForegroundColor Yellow
    }
    Write-Host ""
}

# --- Resumen ---
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
if ($failed) {
    Write-Host "Resultado: HAY FALLOS" -ForegroundColor Red
    exit 1
} else {
    Write-Host "Resultado: VALIDACIONES DISPONIBLES EXITOSAS" -ForegroundColor Green
    exit 0
}
