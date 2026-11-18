#requires -Version 5.1
<#
.SINOPSIS
    Verifica que el entorno de desarrollo de Grand Sirenis Locker App este listo.
    Comprueba versiones de PHP, Node.js, npm, Git, extensiones PHP (pdo_mysql, session),
    puerto 8000 libre y conectividad a MySQL.

.DESCRIPCIÓN
    Script de validacion de entorno para Windows. No instala nada ni cambia configuracion global.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$root = (Get-Item .).FullName
$errors = @()
$warnings = @()

Write-Host "=== Verificacion de entorno: Grand Sirenis Locker App ===" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "Raiz: $root" -ForegroundColor Gray
Write-Host ""

# --- PHP ---
Write-Host "--- PHP ---" -ForegroundColor Yellow
$php = Get-Command php -ErrorAction SilentlyContinue
if ($php) {
    $phpVersion = (& $php.Source -v 2>&1 | Select-Object -First 1)
    Write-Host "PHP encontrado: $($php.Source.Source)" -ForegroundColor Green
    Write-Host "  $phpVersion" -ForegroundColor Gray
    $modules = (& $php.Source -m 2>&1)
    foreach ($req in @('PDO','pdo_mysql','session')) {
        if ($modules -match $req) {
            Write-Host "  Extensión $req: presente" -ForegroundColor Green
        } else {
            $errors += "Extensión PHP faltante: $req"
            Write-Host "  Extensión $req: AUSENTE" -ForegroundColor Red
        }
    }
} else {
    $xamppPhp = 'C:\xampp\php\php.exe'
    if (Test-Path $xamppPhp) {
        Write-Host "PHP no esta en el PATH, pero se encontro en XAMPP: $xamppPhp" -ForegroundColor Yellow
    } else {
        $errors += "PHP no encontrado ni en PATH ni en C:\xampp\php\php.exe"
        Write-Host "PHP: NO ENCONTRADO" -ForegroundColor Red
    }
}

# --- Node.js y npm ---
Write-Host ""
Write-Host "--- Node.js / npm ---" -ForegroundColor Yellow
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $nv = node -v 2>&1
    $npmv = npm -v 2>&1
    Write-Host "Node.js: $nv" -ForegroundColor Green
    Write-Host "npm: $npmv" -ForegroundColor Green
} else {
    $errors += "Node.js no encontrado"
    Write-Host "Node.js: NO ENCONTRADO" -ForegroundColor Red
}

# --- Git ---
Write-Host ""
Write-Host "--- Git ---" -ForegroundColor Yellow
$git = Get-Command git -ErrorAction SilentlyContinue
if ($git) {
    $gv = git --version 2>&1
    Write-Host "$gv" -ForegroundColor Green
} else {
    $warnings += "Git no encontrado"
    Write-Host "Git: NO ENCONTRADO (opcional para desarrollo local)" -ForegroundColor Yellow
}

# --- MySQL (puerto 3306) ---
Write-Host ""
Write-Host "--- MySQL / MariaDB ---" -ForegroundColor Yellow
try {
    $socket = New-Object System.Net.Sockets.TcpClient
    $task = $socket.ConnectAsync('127.0.0.1', 3306)
    $ok = $task.Wait(2000)
    if ($ok -and $socket.Connected) {
        Write-Host "MySQL disponible en 127.0.0.1:3306" -ForegroundColor Green
    } else {
        $errors += "MySQL no responde en 127.0.0.1:3306 (XAMPP/MySQL apagado)"
        Write-Host "MySQL: NO RESPONDE en 127.0.0.1:3306" -ForegroundColor Red
    }
    $socket.Close()
} catch {
    $errors += "No se pudo verificar MySQL: $_"
    Write-Host "MySQL: ERROR al verificar" -ForegroundColor Red
}

# --- Puerto 8000 ---
Write-Host ""
Write-Host "--- Puerto 8000 ---" -ForegroundColor Yellow
$portUsed = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($portUsed) {
    $warnings += "Puerto 8000 ya en uso (PHP servidor ya podria estar corriendo)"
    Write-Host "Puerto 8000: EN USO" -ForegroundColor Yellow
} else {
    Write-Host "Puerto 8000: LIBRE" -ForegroundColor Green
}

# --- Archivos esenciales ---
Write-Host ""
Write-Host "--- Archivos esenciales ---" -ForegroundColor Yellow
$essential = @(
    'private\bootstrap.php',
    'private\config.php',
    'public\index.php',
    'public\login.php',
    'public\register.php',
    'public\logout.php',
    'public\api.php',
    'public\manifest.webmanifest',
    'public\sw.js',
    'db\schema.sql'
)
foreach ($f in $essential) {
    $path = Join-Path $root $f
    if (Test-Path $path) {
        Write-Host "  OK: $f" -ForegroundColor Green
    } else {
        $errors += "Falta archivo esencial: $f"
        Write-Host "  FALTA: $f" -ForegroundColor Red
    }
}

# --- Resumen ---
Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
if ($errors.Count -eq 0) {
    Write-Host "Resultado: ENTORNO LISTO (sin errores)" -ForegroundColor Green
} else {
    Write-Host "Resultado: ERRORES DETECTADOS" -ForegroundColor Red
    foreach ($e in $errors) { Write-Host "  [!] $e" -ForegroundColor Red }
}
if ($warnings.Count -gt 0) {
    Write-Host "Advertencias:" -ForegroundColor Yellow
    foreach ($w in $warnings) { Write-Host "  [*] $w" -ForegroundColor Yellow }
}
Write-Host ""

if ($errors.Count -gt 0) {
    exit 1
}
exit 0
