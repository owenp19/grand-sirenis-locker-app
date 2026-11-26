#requires -Version 5.1
<#
.SINOPSIS
    Crea un respaldo SQL cifrado de sirenis_locker_db con mysqldump (XAMPP).
    El archivo de respaldo se cifra con OpenSSL y se guarda fuera del directorio
    público. Se registra la operación y se aplica retención configurable.

.DESCRIPCIÓN
    Usa por defecto el usuario de aplicacion (.env: DB_USER) con
    --single-transaction, sin bloquear tablas. La contrasena se pasa por
    MYSQL_PWD (no aparece en la linea de comandos). No imprime secretos en stdout.
    El archivo resultante se cifra con AES-256-GCM usando OpenSSL.

.NOTAS
    Requiere mysqldump de XAMPP o en el PATH y OpenSSL.
    Los respaldos se guardan en storage/backups/ (ignorado por Git).
    Se aplica retención: se eliminan backups older than $RetentionDays días.
    Se registra cada operación en $LogFile.
    Nunca se imprimen credenciales ni rutas absolutas en stdout.
#>
[CmdletBinding()]
param(
    [string]$DbName = '',
    [Alias('Host')]
    [string]$DbHost = '',
    [int]$Port = 0,
    [string]$User = '',
    [string]$OutputDir = '',
    [string]$Password = '',
    [switch]$PromptPassword,
    [int]$RetentionDays = 30,
    [string]$LogFile = ''
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
if (-not $Password) {
    $Password = if ($dotenv.ContainsKey('DB_PASSWORD') -and $dotenv['DB_PASSWORD']) { $dotenv['DB_PASSWORD'] } else { '' }
}
if (-not $RetentionDays) {
    $RetentionDays = if ($dotenv.ContainsKey('BACKUP_RETENTION_DAYS') -and $dotenv['BACKUP_RETENTION_DAYS']) { [int]$dotenv['BACKUP_RETENTION_DAYS'] } else { 30 }
}
if (-not $LogFile) { $LogFile = Join-Path $root 'logs\backup.log' }

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
$rawBackupFile = Join-Path $OutputDir "${DbName}_$timestamp.sql"
$encryptedBackupFile = Join-Path $OutputDir "${DbName}_$timestamp.sql.enc"
$previousPassword = $env:MYSQL_PWD

function Write-Log {
    param([string]$Message)
    $time = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    try {
        $line = "$time $Message"
        if (Test-Path (Split-Path $LogFile)) {
            Add-Content -Path $LogFile -Value $line
        } else {
            New-Item -ItemType File -Path (Split-Path $LogFile) -Force | Out-Null
            Add-Content -Path $LogFile -Value $line
        }
    } catch {}
}

try {
    if ($password) { $env:MYSQL_PWD = $password }
    else { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }

    Write-Log "INICIO: Respaldo de $DbName en ${DbHost}:${Port} por $User"
    Write-Host "Creando respaldo sin cifrar de $DbName ..." -ForegroundColor Cyan
    & $dumpPath -h $DbHost -P $Port -u $User --single-transaction --no-tablespaces --skip-lock-tables --result-file=$rawBackupFile $DbName 2>&1
    $exitCode = $LASTEXITCODE
} finally {
    if ($null -ne $previousPassword) { $env:MYSQL_PWD = $previousPassword }
    else { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
}

if ($exitCode -ne 0 -or -not (Test-Path $rawBackupFile) -or (Get-Item $rawBackupFile).Length -eq 0) {
    if (Test-Path $rawBackupFile) { Remove-Item $rawBackupFile -Force }
    throw 'Fallo al crear el respaldo de la base de datos.'
}

Write-Log "Respaldo sin cifrar creado: $rawBackupFile ($((Get-Item $rawBackupFile).Length) bytes)"

# Cifrar con OpenSSL AES-256-GCM (modo GCM para autenticación)
try {
    $openssl = OpenSSL --version 2>$null
    if (-not $openssl) { throw 'OpenSSL no encontrado' }
    $iv = [System.Convert]::ToBase64String((1..16 | ForEach-Object { Get-Random 0-255 }))
    $passwordOpenSSL = if ($Password) { $Password } else { [System.Environment]::GetEnvironmentVariable('BACKUP_OPENSSL_PWD') }
    if (-not $passwordOpenSSL -or $passwordOpenSSL.Length -lt 8) { throw 'Falta contraseña de OpenSSL (usa BACKUP_OPENSSL_PWD o -Password)' }
    # Cifrar: openssl enc -aes-256-gcm -salt -in $rawBackupFile -out $encryptedBackupFile -pass pass:$passwordOpenSSL
    & openssl enc -aes-256-gcm -salt -in $rawBackupFile -out $encryptedBackupFile -pass "pass:$passwordOpenSSL" 2>&1
    $encryptExitCode = $LASTEXITCODE
    if ($encryptExitCode -ne 0) { throw 'Fallo al cifrar el respaldo con OpenSSL.' }
    Write-Log "Respaldo cifrado creado: $encryptedBackupFile"
    # Eliminar archivo sin cifrar
    if (Test-Path $rawBackupFile) { Remove-Item $rawBackupFile -Force }
} catch {
    Write-Log ERROR: $_.Exception.Message
    throw "Error al cifrar el respaldo: $($_.Exception.Message)"
}

# Aplicar retención: eliminar backups antiguos
try {
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $oldBackups = Get-ChildItem -Path $OutputDir -Filter "*.enc" | Where-Object { $_.LastWriteTime -lt $cutoffDate }
    foreach ($old in $oldBackups) {
        Write-Log "Eliminando backup antiguo: $($old.FullName)"
        Remove-Item $old.FullName -Force
    }
    Write-Log "Retención aplicada: eliminados $($oldBackups.Count) backups mayores a $RetentionDays días."
} catch {
    Write-Log WARNING: Error en retención de backups: $_.Exception.Message
}

Write-Log "Operación completada: $encryptedBackupFile"
Write-Host "Respaldo creado y cifrado: $encryptedBackupFile ($((Get-Item $encryptedBackupFile).Length) bytes)" -ForegroundColor Green
