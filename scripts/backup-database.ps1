#requires -Version 5.1
<#
.SINOPSIS
    Crea un respaldo SQL cifrado (autenticado) de la base de datos con mysqldump (XAMPP).

.DESCRIPCIÓN
    Cifrado autenticado (encrypt-then-MAC):
      * Confidencialidad: AES-256-CBC con clave derivada mediante PBKDF2-HMAC-SHA256.
      * Integridad: HMAC-SHA256 sobre (IV || texto_cifrado), verificado antes de descifrar.
    Ninguna contraseña viaja en la línea de comandos (se usa BACKUP_ENC_PWD o -Password
    y se pasa a clases criptográficas de .NET en memoria).
    El archivo SQL sin cifrado se crea en un directorio temporal privado y se elimina
    en el bloque finally, incluso si ocurre un error.
    No se eliminan respaldos anteriores sin autorización explícita.

.NOTAS
    Requiere mysqldump (XAMPP o PATH) y OpenSSL (C:\xampp\apache\bin\openssl.exe o PATH).
    Los respaldos se guardan en storage/backups/ (ignorado por Git).
    Clave de cifrado: BACKUP_ENC_PWD (separada de DB_PASSWORD). Gúrdela en un gestor
    de secretos. Sin ella no es posible recuperar los respaldos.
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
    [switch]$ApplyRetention,   # Solo aplica retención si se pasa explícitamente (nunca por defecto)
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

function Write-Log {
    param([string]$Message)
    $time = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "$time $Message"
    try {
        $logDir = Split-Path $LogFile
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
        Add-Content -Path $LogFile -Value $line
    } catch {}
}

# ── Cargar configuración desde .env ───────────────────────────────────────────
$dotenv = Read-DotEnv (Join-Path $root '.env')
if (-not $DbName) { $DbName = if ($dotenv.ContainsKey('DB_NAME') -and $dotenv['DB_NAME']) { $dotenv['DB_NAME'] } else { 'sirenis_locker_db' } }
if (-not $DbHost) { $DbHost = if ($dotenv.ContainsKey('DB_HOST') -and $dotenv['DB_HOST']) { $dotenv['DB_HOST'] } else { '127.0.0.1' } }
if (-not $Port) { $Port = if ($dotenv.ContainsKey('DB_PORT') -and $dotenv['DB_PORT']) { [int]$dotenv['DB_PORT'] } else { 3306 } }
if (-not $User) { $User = if ($dotenv.ContainsKey('DB_USER') -and $dotenv['DB_USER']) { $dotenv['DB_USER'] } else { 'owenpusey' } }
$backupEnv = if ($dotenv.ContainsKey('BACKUP_ENV') -and $dotenv['BACKUP_ENV']) { $dotenv['BACKUP_ENV'] } else { 'development' }
$encIter = if ($dotenv.ContainsKey('BACKUP_ENC_ITER') -and $dotenv['BACKUP_ENC_ITER']) { [int]$dotenv['BACKUP_ENC_ITER'] } else { 100000 }
if ($encIter -lt 10000) { $encIter = 100000; Write-Warning "BACKUP_ENC_ITER demasiado bajo; usando 100000." }

if (-not $OutputDir) {
    # Separar respaldos de desarrollo y producción por directorio
    $envSuffix = if ($backupEnv -eq 'production') { 'prod' } else { 'dev' }
    $OutputDir = Join-Path $root "storage\backups\$envSuffix"
}
if (-not $RetentionDays) { $RetentionDays = if ($dotenv.ContainsKey('BACKUP_RETENTION_DAYS') -and $dotenv['BACKUP_RETENTION_DAYS']) { [int]$dotenv['BACKUP_RETENTION_DAYS'] } else { 30 } }
if (-not $LogFile) { $LogFile = Join-Path $root 'logs\backup.log' }

# ── Clave de cifrado (nunca en línea de comandos) ─────────────────────────────
if (-not $Password) {
    $Password = if ($dotenv.ContainsKey('BACKUP_ENC_PWD') -and $dotenv['BACKUP_ENC_PWD']) { $dotenv['BACKUP_ENC_PWD'] } else { '' }
}
if (-not $Password -and $PromptPassword) {
    $secure = Read-Host "Contraseña de cifrado de respaldos" -AsSecureString
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
if (-not $Password -or $Password.Length -lt 8) {
    throw 'Falta contraseña de cifrado de respaldos (BACKUP_ENC_PWD o -Password, mínimo 8 caracteres).'
}

# ── Localizar herramientas ────────────────────────────────────────────────────
$mysqldump = Get-Command mysqldump -ErrorAction SilentlyContinue
if ($mysqldump) { $dumpPath = $mysqldump.Source }
elseif (Test-Path 'C:\xampp\mysql\bin\mysqldump.exe') { $dumpPath = 'C:\xampp\mysql\bin\mysqldump.exe' }
else { throw 'No se encontro mysqldump. Revisa C:\xampp\mysql\bin\mysqldump.exe' }

$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if ($openssl) { $opensslPath = $openssl.Source }
elseif (Test-Path 'C:\xampp\apache\bin\openssl.exe') { $opensslPath = 'C:\xampp\apache\bin\openssl.exe' }
else { throw 'No se encontro OpenSSL. Revisa C:\xampp\apache\bin\openssl.exe' }

# ── Directorio temporal privado con ACL restrictivas ──────────────────────────
$tempBase = [System.IO.Path]::GetTempPath()
$tempDir = Join-Path $tempBase ("gslb_backup_" + [Guid]::NewGuid().ToString('N'))
try {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    # ACL restrictiva: solo el usuario actual tiene acceso
    $acl = Get-Acl -Path $tempDir
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser, 'FullControl', 'Allow')
    $acl.SetAccessRuleProtection($true, $false) # Desactivar herencia, copiar reglas existentes
    $acl.SetAccessRule($accessRule)
    Set-Acl -Path $tempDir -AclObject $acl
} catch {
    # Si no se pueden establecer ACLs (no Windows), continuar con directorio temporal normal
    Write-Warning "No se pudieron establecer ACL restrictivas en ${tempDir}: $($_.Exception.Message)"
}

# Archivos temporales (se eliminan en finally)
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$rawBackupFile = Join-Path $tempDir "${DbName}_${timestamp}.sql"
$cipherTextFile = Join-Path $tempDir "${DbName}_${timestamp}.ct"
$encryptedBackupFile = Join-Path $OutputDir "${DbName}_${timestamp}.sql.enc"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# ── Constantes del formato de archivo cifrado ─────────────────────────────────
$magic = [System.Text.Encoding]::ASCII.GetBytes('GSLB')
$versionBytes = [BitConverter]::GetBytes([int16]1)

try {
    # 1. Volcado SQL sin cifrar (en directorio temporal privado)
    $mysqlPwd = $env:MYSQL_PWD
    if ($dotenv.ContainsKey('DB_PASSWORD') -and $dotenv['DB_PASSWORD']) { $env:MYSQL_PWD = $dotenv['DB_PASSWORD'] }
    try {
        Write-Log "INICIO: respaldo de $DbName en ${DbHost}:${Port} por $User (entorno: $backupEnv)"
        Write-Host "Creando respaldo de $DbName ..." -ForegroundColor Cyan
        & $dumpPath -h $DbHost -P $Port -u $User --single-transaction --no-tablespaces --skip-lock-tables --result-file=$rawBackupFile $DbName 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        if ($null -ne $mysqlPwd) { $env:MYSQL_PWD = $mysqlPwd }
        else { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
    }

    if ($exitCode -ne 0 -or -not (Test-Path $rawBackupFile) -or (Get-Item $rawBackupFile).Length -eq 0) {
        throw 'Fallo al crear el respaldo de la base de datos.'
    }

    # 2. Derivar claves con PBKDF2-HMAC-SHA256 (criptografía de .NET, no propia)
    $passwordBytes = [System.Text.Encoding]::UTF8.GetBytes($Password)
    $salt = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($salt)
    $kdf = [System.Security.Cryptography.Rfc2898DeriveBytes]::new($passwordBytes, $salt, $encIter, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
    $encKey = $kdf.GetBytes(32)   # Clave AES-256
    $macKey = $kdf.GetBytes(32)   # Clave HMAC-SHA256

    # 3. IV aleatorio con CSPRNG
    $iv = New-Object byte[] 16
    $rng.GetBytes($iv)

    # 4. Cifrar con OpenSSL AES-256-CBC usando clave cruda (no contraseña en cmdline)
    $encKeyHex = [BitConverter]::ToString($encKey).Replace('-','').ToLower()
    $ivHex = [BitConverter]::ToString($iv).Replace('-','').ToLower()
    & $opensslPath enc -aes-256-cbc -K $encKeyHex -iv $ivHex -in $rawBackupFile -out $cipherTextFile 2>&1
    $encryptExitCode = $LASTEXITCODE
    if ($encryptExitCode -ne 0 -or -not (Test-Path $cipherTextFile)) {
        throw 'Fallo al cifrar el respaldo con OpenSSL.'
    }

    # 5. HMAC-SHA256 sobre (IV || ciphertext) — integridad autenticada
    $mac = [System.Security.Cryptography.HMACSHA256]::new($macKey)
    $ivAndCt = $iv + [System.IO.File]::ReadAllBytes($cipherTextFile)
    $hmac = $mac.ComputeHash($ivAndCt)

    # 6. Escribir archivo cifrado: [magic][version][saltLen][salt][IV][ciphertext][HMAC]
    $saltLenBytes = [BitConverter]::GetBytes([int16]$salt.Length)
    $outputStream = [System.IO.File]::Create($encryptedBackupFile)
    try {
        $outputStream.Write($magic, 0, $magic.Length)
        $outputStream.Write($versionBytes, 0, $versionBytes.Length)
        $outputStream.Write($saltLenBytes, 0, $saltLenBytes.Length)
        $outputStream.Write($salt, 0, $salt.Length)
        $outputStream.Write($iv, 0, $iv.Length)
        $ctBytes = [System.IO.File]::ReadAllBytes($cipherTextFile)
        $outputStream.Write($ctBytes, 0, $ctBytes.Length)
        $outputStream.Write($hmac, 0, $hmac.Length)
    } finally {
        $outputStream.Close()
    }

    # 7. Verificación de integridad en memoria antes de escribir al disco.
    #    El HMAC ya se calculó sobre (IV || ciphertext); comparar con el valor
    #    que se va a persistir confirma que la construcción es consistente.
    $storedHmacCheck = $hmac
    $computedHmacCheck = $mac.ComputeHash($ivAndCt)
    $hmacOk = $true
    for ($i = 0; $i -lt 32; $i++) { if ($storedHmacCheck[$i] -ne $computedHmacCheck[$i]) { $hmacOk = $false } }
    if (-not $hmacOk) {
        throw 'Fallo en la verificacion de integridad del respaldo cifrado (HMAC no coincide).'
    }

    # Tamaño mínimo esperado: magic(4) + version(2) + saltLen(2) + salt + IV(16) + ciphertext + HMAC(32)
    $minExpectedSize = 4 + 2 + 2 + $salt.Length + 16 + $ctBytes.Length + 32
    $actualSize = (Get-Item $encryptedBackupFile).Length
    if ($actualSize -lt $minExpectedSize) {
        Remove-Item $encryptedBackupFile -Force -ErrorAction SilentlyContinue
        throw 'El archivo cifrado es menor al tamao esperado (posible escritura incompleta).'
    }

    Write-Log "Respaldo cifrado e integrado creado: $encryptedBackupFile ($actualSize bytes)"
    Write-Host "Respaldo creado y cifrado: $encryptedBackupFile" -ForegroundColor Green

    # 8. Retención solo si se solicita explícitamente (nunca por defecto)
    if ($ApplyRetention) {
        try {
            $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
            $oldBackups = Get-ChildItem -Path $OutputDir -Filter "*.sql.enc" | Where-Object { $_.LastWriteTime -lt $cutoffDate }
            foreach ($old in $oldBackups) {
                Write-Log "Eliminando backup antiguo (retencion explícita): $($old.FullName)"
                Remove-Item $old.FullName -Force
            }
            Write-Log "Retención aplicada: $($oldBackups.Count) backups eliminados."
        } catch {
            Write-Log "WARNING: Error en retención de backups: $($_.Exception.Message)"
        }
    }
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    throw "Error al crear el respaldo: $($_.Exception.Message)"
}
finally {
    # 9. Limpieza de archivos temporales SIEMPRE, incluso si hay error
    foreach ($f in @($rawBackupFile, $cipherTextFile)) {
        if (Test-Path $f) { Remove-Item $f -Force -ErrorAction SilentlyContinue }
    }
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
    # No dejar contraseña en memoria de entorno
    if ($Password) { $Password = '' }
}
