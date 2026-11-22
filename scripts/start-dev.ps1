#requires -Version 5.1
<#
.SINOPSIS
    Inicia el entorno de desarrollo de Grand Sirenis Locker App.
    Arranca el servidor PHP integrado sirviendo la carpeta public/.

.DESCRIPCIÓN
    Script para Windows (PowerShell). No instala servicios ni cambia
    configuracion global. No almacena credenciales. Lee .env solo para
    mostrar la base de datos configurada.

.NOTAS
    Requiere PHP en el PATH o C:\xampp\php\php.exe.
    MySQL debe estar encendido por separado (XAMPP).
#>
[CmdletBinding()]
param(
    [Alias('Host')]
    [string]$BindAddress = '127.0.0.1',
    [int]$Port = 8000,
    [switch]$LaunchBrowser
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$public = Join-Path $root 'public'

function Read-DotEnv([string]$Path) {
    $values = @{}
    if (Test-Path $Path) {
        Get-Content $Path | ForEach-Object {
            if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
                $values[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
            }
        }
    }
    return $values
}

function Test-TcpPort([string]$TargetHost, [int]$TargetPort, [int]$TimeoutMs = 2000) {
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

Write-Host "Grand Sirenis Locker App - Entorno de desarrollo" -ForegroundColor Cyan
Write-Host "Raiz: $root" -ForegroundColor Gray

# 1. Localizar PHP
$phpCmd = Get-Command php -ErrorAction SilentlyContinue
if ($phpCmd) {
    $phpPath = $phpCmd.Source
} elseif (Test-Path 'C:\xampp\php\php.exe') {
    $phpPath = 'C:\xampp\php\php.exe'
    Write-Host "PHP no esta en PATH; usando XAMPP: $phpPath" -ForegroundColor Yellow
} else {
    throw 'No se encontro PHP. Instala PHP o revisa C:\xampp\php\php.exe'
}

# 2. Leer configuracion local (sin mostrar secretos)
$envFile = Join-Path $root '.env'
$dotenv = Read-DotEnv $envFile
$dbHost = '127.0.0.1'
$dbPort = 3306
$dbName = 'sirenis_locker_db'
if ($dotenv.ContainsKey('DB_HOST') -and $dotenv['DB_HOST']) { $dbHost = $dotenv['DB_HOST'] }
if ($dotenv.ContainsKey('DB_PORT') -and $dotenv['DB_PORT']) { $dbPort = [int]$dotenv['DB_PORT'] }
if ($dotenv.ContainsKey('DB_NAME') -and $dotenv['DB_NAME']) { $dbName = $dotenv['DB_NAME'] }
if (-not (Test-Path $envFile)) {
    Write-Warning "No existe .env. Copia .env.example a .env y configura la base de datos."
}

# 3. Verificar puerto libre
if (Test-TcpPort $BindAddress $Port 500) {
    throw "El puerto $Port ya esta en uso. Liberalo o usa -Port con otro valor."
}

# 4. Verificar MySQL
if (Test-TcpPort $dbHost $dbPort 2000) {
    Write-Host "MySQL disponible en ${dbHost}:${dbPort} (base: $dbName)" -ForegroundColor Green
} else {
    Write-Warning "MySQL no responde en ${dbHost}:${dbPort}. Enciende XAMPP/MySQL antes de usar la app."
}

# 5. Iniciar PHP
Write-Host "Iniciando PHP en http://${BindAddress}:${Port} (sirviendo public/)..." -ForegroundColor Cyan
$process = Start-Process -FilePath $phpPath `
    -ArgumentList @('-S', "${BindAddress}:${Port}", '-t', $public) `
    -WorkingDirectory $root -PassThru -WindowStyle Hidden
Write-Host "PID de PHP: $($process.Id)" -ForegroundColor Green
Write-Host "Abre: http://${BindAddress}:${Port}/ (Welcome Page)" -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener el servidor." -ForegroundColor Gray

if ($LaunchBrowser) {
    Start-Process "http://${BindAddress}:${Port}/"
}

try {
    Wait-Process -Id $process.Id
} finally {
    if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Write-Host 'Servidor PHP detenido.' -ForegroundColor Yellow
    }
}
