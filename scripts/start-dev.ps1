#requires -Version 5.1
<#
.SINOPSIS
    Inicia el entorno de desarrollo de Grand Sirenis Locker App.
    Arranca el servidor PHP integrado en http://127.0.0.1:8000 sirviendo la carpeta public/.
    Verifica que MySQL esté disponible antes de continuar.

.DESCRIPCIÓN
    Script para Windows (PowerShell). No instala servicios ni cambia configuración global.
    No almacena credenciales.

.NOTAS
    Requiere PHP en el PATH o C:\xampp\php\php.exe.
    MySQL debe estar encendido por separado (XAMPP).
#>
[CmdletBinding()]
param(
    [int]$Port = 8000,
    [string]$Host = '127.0.0.1',
    [switch]$LaunchBrowser
)

$ErrorActionPreference = 'Stop'
$root = (Get-Item .).FullName
$public = Join-Path $root 'public'

Write-Host "Grand Sirenis Locker App - Entorno de desarrollo" -ForegroundColor Cyan
Write-Host "Raiz: $root" -ForegroundColor Gray

# 1. Localizar PHP
$phpCmd = Get-Command php -ErrorAction SilentlyContinue
if (-not $phpCmd) {
    $xamppPhp = 'C:\xampp\php\php.exe'
    if (Test-Path $xamppPhp) {
        $phpCmd = $xamppPhp
        Write-Host "Usando PHP de XAMPP: $phpCmd" -ForegroundColor Yellow
    } else {
        Write-Error "No se encontro PHP. Instala PHP o revisa C:\xampp\php\php.exe"
    }
} else {
    $phpCmd = $phpCmd.Source
}

# 2. Verificar puerto libre
$portUsed = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($portUsed) {
    Write-Error "El puerto $Port ya esta en uso. Liberalo y vuelve a intentar."
}

# 3. Verificar MySQL (intento ligero de resolucion de host/puerto)
$mysqlHost = '127.0.0.1'
$mysqlPort = 3306
try {
    $socket = New-Object System.Net.Sockets.TcpClient
    $connectTask = $socket.ConnectAsync($mysqlHost, $mysqlPort)
    $completed = $connectTask.Wait(2000)
    if (-not $completed -or -not $socket.Connected) {
        Write-Warning "MySQL no responde en $mysqlHost:$mysqlPort. Asegurate de tener XAMPP/MySQL encendido."
    } else {
        Write-Host "MySQL disponible en $mysqlHost:$mysqlPort" -ForegroundColor Green
    }
    $socket.Close()
} catch {
    Write-Warning "No se pudo verificar MySQL en $mysqlHost:$mysqlPort. Asegurate de tenerlo encendido."
}

# 4. Iniciar PHP
Write-Host "Iniciando PHP en http://$Host:$Port (sirviendo public/)..." -ForegroundColor Cyan
$process = Start-Process -FilePath $phpCmd -ArgumentList @("-S","$Host:$Port","-t",$public) -PassThru -WindowStyle Hidden
Write-Host "PID de PHP: $($process.Id)" -ForegroundColor Green
Write-Host "Abre: http://$Host:$Port/login.php" -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener el servidor." -ForegroundColor Gray

# 5. Opcional: abrir navegador
if ($LaunchBrowser) {
    Start-Process "http://$Host:$Port/login.php"
}

# Mantener el script vivo mientras el servidor corra
try {
    while (-not $process.HasExited) {
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host "Deteniendo servidor PHP..." -ForegroundColor Yellow
    Stop-Process -Id $process.Id -Force
}
