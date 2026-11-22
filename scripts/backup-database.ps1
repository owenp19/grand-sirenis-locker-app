#requires -Version 5.1
<#
.SINOPSIS
    Crea un respaldo SQL de sirenis_locker_db con mysqldump (XAMPP).

.DESCRIPCIÓN
    Usa por defecto el usuario de aplicacion (.env: DB_USER) con
    --single-transaction, sin bloquear tablas. La contrasena se pasa por
    MYSQL_PWD (no aparece en la linea de comandos). No imprime secretos.

.NOTAS
    Requiere mysqldump de XAMPP o en el PATH.
    Los respaldos se guardan en storage/backups/ (ignorado por Git).
#>
[CmdletBinding()]
param(
    [string]$DbName = '',
    [Alias('Host')]
    [string]$DbHost = '',
    [int]$Port = 0,
    [string]$User = '',
    [string]$OutputDir = '',
    [switch]$PromptPassword
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

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

$dotenv = Read-DotEnv (Join-Path $root '.env')
if (-not $DbName) {
    $DbName = if ($dotenv.ContainsKey('DB_NAME') -and $dotenv['DB_NAME']) { $dotenv['DB_NAME'] } else { 'sirenis_locker_db' }
}
if (-not $DbHost) {
    $DbHost = if ($dotenv.ContainsKey('DB_HOST') -and $dotenv['DB_HOST']) { $dotenv['DB_HOST'] } else { '127.0.0.1' }
}
if (-not $Port) {
    $Port = if ($dotenv.ContainsKey('DB_PORT') -and $dotenv['DB_PORT']) { [int]$dotenv['DB_PORT'] } else { 3306 }
}
if (-not $User) {
    $User = if ($dotenv.ContainsKey('DB_USER') -and $dotenv['DB_USER']) { $dotenv['DB_USER'] } else { 'owenpusey' }
}
if (-not $OutputDir) { $OutputDir = Join-Path $root 'storage\backups' }

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Localizar mysqldump
$mysqldump = Get-Command mysqldump -ErrorAction SilentlyContinue
if ($mysqldump) {
    $dumpPath = $mysqldump.Source
} elseif (Test-Path 'C:\xampp\mysql\bin\mysqldump.exe') {
    $dumpPath = 'C:\xampp\mysql\bin\mysqldump.exe'
    Write-Host "Usando mysqldump de XAMPP: $dumpPath" -ForegroundColor Yellow
} else {
    throw 'No se encontro mysqldump. Revisa C:\xampp\mysql\bin\mysqldump.exe'
}

# Contrasena: MYSQL_PWD o .env; nunca en argumentos
$password = $env:MYSQL_PWD
if (-not $password -and $dotenv.ContainsKey('DB_PASSWORD') -and $dotenv['DB_PASSWORD']) {
    $password = $dotenv['DB_PASSWORD']
}
if (-not $password -and $PromptPassword) {
    $secure = Read-Host "Contrasena de MySQL para $User" -AsSecureString
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$backupFile = Join-Path $OutputDir "${DbName}_$timestamp.sql"
$previousPassword = $env:MYSQL_PWD

try {
    if ($password) { $env:MYSQL_PWD = $password }
    else { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }

    Write-Host "Creando respaldo de $DbName en ${DbHost}:${Port} ..." -ForegroundColor Cyan
    & $dumpPath -h $DbHost -P $Port -u $User --single-transaction --no-tablespaces --skip-lock-tables --result-file=$backupFile $DbName 2>&1
    $exitCode = $LASTEXITCODE
} finally {
    if ($null -ne $previousPassword) { $env:MYSQL_PWD = $previousPassword }
    else { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
}

if ($exitCode -ne 0 -or -not (Test-Path $backupFile) -or (Get-Item $backupFile).Length -eq 0) {
    if (Test-Path $backupFile) { Remove-Item $backupFile -Force }
    throw 'Fallo al crear el respaldo de la base de datos.'
}

Write-Host "Respaldo creado: $backupFile ($((Get-Item $backupFile).Length) bytes)" -ForegroundColor Green
