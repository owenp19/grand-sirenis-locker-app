#requires -Version 5.1
<#
.SINOPSIS
    Ejecuta las pruebas de sintaxis PHP y, si esta disponible, las pruebas Playwright.

.DESCRIPCIÓN
    Script para validar codigo y ejecutar pruebas funcionales en Windows.
    No ejecuta pruebas destructivas ni sobre datos reales.
#>
[CmdletBinding()]
param(
    [switch]$SkipPhp,
    [switch]$SkipPlaywright,
    [string]$Browser = 'chromium'
)

$ErrorActionPreference = 'Continue'
$root = (Get-Item .).FullName
$failed = $false

Write-Host "=== Ejecucion de pruebas: Grand Sirenis Locker App ===" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# --- PHP syntax ---
if (-not $SkipPhp) {
    Write-Host "--- Sintaxis PHP (php -l) ---" -ForegroundColor Yellow
    $phpFiles = Get-ChildItem -Recurse -Filter *.php -Path $root | Where-Object {
        $_.FullName -notlike '*node_modules*'
    }
    $phpOk = 0; $phpFail = 0
    foreach ($f in $phpFiles) {
        $result = & php -l $f.FullName 2>&1
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

# --- Playwright ---
if (-not $SkipPlaywright) {
    Write-Host "--- Pruebas Playwright ($Browser) ---" -ForegroundColor Yellow
    $playwrightCmd = Get-Command npx -ErrorAction SilentlyContinue
    if (-not $playwrightCmd) {
        Write-Host "npx/Node no disponible. Saltando pruebas Playwright." -ForegroundColor Yellow
        Write-Host "Estado: BLOQUEADO (falta Node.js/npm)" -ForegroundColor Yellow
    } else {
        $configExists = Test-Path (Join-Path $root 'tests\playwright.config.js')
        if (-not $configExists) {
            Write-Host "No existe tests/playwright.config.js. Crea la configuracion antes de ejecutar pruebas." -ForegroundColor Yellow
            Write-Host "Estado: PENDIENTE (falta configuracion de Playwright)" -ForegroundColor Yellow
        } else {
            Write-Host "Ejecutando: npx playwright test --browser=$Browser" -ForegroundColor Gray
            & npx playwright test --browser=$Browser 2>&1
            if ($LASTEXITCODE -ne 0) {
                $failed = $true
                Write-Host "Playwright: PRUEBAS FALLIDAS" -ForegroundColor Red
            } else {
                Write-Host "Playwright: PRUEBAS EXITOSAS" -ForegroundColor Green
            }
        }
    }
    Write-Host ""
}

# --- Resumen ---
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
if ($failed) {
    Write-Host "Resultado: ALGUNAS PRUEBAS FALLIDAS O BLOQUEADAS" -ForegroundColor Red
    exit 1
} else {
    Write-Host "Resultado: TODAS LAS PRUEBAS DISPONIBLES EXITOSAS" -ForegroundColor Green
    exit 0
}
