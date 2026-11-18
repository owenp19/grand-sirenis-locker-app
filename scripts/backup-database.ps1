#requires -Version 5.1
<#
.SINOPSIS
    Crea un respaldo de la base de datos hotel_lockers usando mysqldump (XAMPP).

.DESCRIPCIÓN
    Script de respaldo para Windows. Exporta la base de datos a storage/backups/
    con nombre con fecha. No almacena credenciales en el script; las lee de
    variables de entorno o las solicita de forma interactiva.

.NOTAS
    Requiere mysqldump de XAMPP (C:\xampp\mysql\bin\mysqldump.exe) o en el PATH.
    Las credenciales NO se escriben en este archivo.
#>
[CmdletBinding()]
param(
    [string]$DbName = 'hotel_lockers',
    [string]$Host = '127.0.0.1',
    [int]$Port = 3306,
    [string]$User = 'root',
    [switch]$PromptPassword
)

$ErrorActionPreference = 'Stop'
$root = (Get-Item .).FullName
$backupDir = Join-Path $root 'storage\backups'

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

# Localizar mysqldump
$mysqldump = Get-Command mysqldump -ErrorAction SilentlyContinue
if (-not $mysqldump) {
    $xamppDump = 'C:\xampp\mysql\bin\mysqldump.exe'
    if (Test-Path $xamppDump) {
        $mysqldump = $xamppDump
        Write-Host "Usando mysqldump de XAMPP: $mysqldump" -ForegroundColor Yellow
    } else {
        Write-Error "No se encontro mysqldump. Instala MySQL/MariaDB o revisa C:\xampp\mysql\bin\mysqldump.exe"
    }
} else {
    $mysqldump = $mysqldump.Source
}

# Credenciales: no se almacenan en el script
$password = $env:MYSQL_PWD
if (-not $password -and $PromptPassword) {
    $password = Read-Host "Contraseña de MySQL para $User" -AsSecureString
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    try { $password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$backupFile = Join-Path $backupDir "hotel_lockers_$timestamp.sql"

$args = @(
    "-h", $Host,
    "-P", $Port,
    "-u", $User,
    $DbName
)
if ($password) {
    $args += @("-p$password")
}

Write-Host "Creando respaldo de $DbName ..." -ForegroundColor Cyan
& $mysqldump $args --result-file=$backupFile 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Respaldo creado: $backupFile" -ForegroundColor Green
} else {
    Write-Error "Fallo al crear el respaldo de la base de datos."
}
