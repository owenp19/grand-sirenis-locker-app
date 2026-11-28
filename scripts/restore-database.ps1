#requires -Version 5.1
<#
.SINOPSIS
    Restaura un respaldo SQL cifrado (autenticado) creado por backup-database.ps1.

.DESCRIPCIÓN
    Proceso de restauración:
      1. Lee el archivo .enc y verifica su formato (magic "GSLB", version).
      2. Pide la contraseña de cifrado (SecureString, nunca en línea de comandos).
      3. Deriva claves con PBKDF2-HMAC-SHA256 usando la sal del archivo.
      4. Verifica HMAC-SHA256 (integridad) ANTES de descifrar.
      5. Descifra AES-256-CBC a un archivo SQL temporal privado.
      6. Restaura mediante el cliente mysql.
      7. Elimina archivos temporales en el bloque finally, incluso si falla.

.NOTAS
    No elimina respaldos anteriores. No imprime secretos en stdout.
    Requiere mysql (XAMPP o PATH) y OpenSSL.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,      # Ruta al archivo .sql.enc
    [string]$DbName = '',
    [Alias('Host')]
    [string]$DbHost = '',
    [int]$Port = 0,
    [string]$User = '',
    [string]$Password = '',   # Contraseña de cifrado (no de MySQL)
    [switch]$PromptPassword,
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
if (-not $LogFile) { $LogFile = Join-Path $root 'logs\restore.log' }
$encIter = if ($dotenv.ContainsKey('BACKUP_ENC_ITER') -and $dotenv['BACKUP_ENC_ITER']) { [int]$dotenv['BACKUP_ENC_ITER'] } else { 100000 }

# ── Clave de cifrado (nunca en línea de comandos) ─────────────────────────────
if (-not $Password) {
    $Password = if ($dotenv.ContainsKey('BACKUP_ENC_PWD') -and $dotenv['BACKUP_ENC_PWD']) { $dotenv['BACKUP_ENC_PWD'] } else { '' }
}
if (-not $Password -and $PromptPassword) {
    $secure = Read-Host "Contraseña de cifrado del respaldo" -AsSecureString
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
if (-not $Password -or $Password.Length -lt 8) {
    throw 'Falta contraseña de cifrado del respaldo (BACKUP_ENC_PWD o -Password).'
}

# ── Localizar herramientas ────────────────────────────────────────────────────
$mysql = Get-Command mysql -ErrorAction SilentlyContinue
if ($mysql) { $mysqlPath = $mysql.Source }
elseif (Test-Path 'C:\xampp\mysql\bin\mysql.exe') { $mysqlPath = 'C:\xampp\mysql\bin\mysql.exe' }
else { throw 'No se encontro mysql. Revisa C:\xampp\mysql\bin\mysql.exe' }

$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if ($openssl) { $opensslPath = $openssl.Source }
elseif (Test-Path 'C:\xampp\apache\bin\openssl.exe') { $opensslPath = 'C:\xampp\apache\bin\openssl.exe' }
else { throw 'No se encontro OpenSSL. Revisa C:\xampp\apache\bin\openssl.exe' }

if (-not (Test-Path $BackupFile)) { throw "No se encontro el archivo de respaldo: $BackupFile" }

# ── Directorio temporal privado ───────────────────────────────────────────────
$tempBase = [System.IO.Path]::GetTempPath()
$tempDir = Join-Path $tempBase ("gslb_restore_" + [Guid]::NewGuid().ToString('N'))
try {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    $acl = Get-Acl -Path $tempDir
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser, 'FullControl', 'Allow')
    $acl.SetAccessRuleProtection($true, $false)
    $acl.SetAccessRule($accessRule)
    Set-Acl -Path $tempDir -AclObject $acl
} catch {
    Write-Warning "No se pudieron establecer ACL restrictivas en ${tempDir}: $($_.Exception.Message)"
}

$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$decryptedSqlFile = Join-Path $tempDir "restore_${timestamp}.sql"

try {
    # 1. Leer y validar formato del archivo cifrado
    $data = [System.IO.File]::ReadAllBytes($BackupFile)
    if ($data.Length -lt 54) { throw 'Archivo de respaldo demasiado corto.' }
    $magic = [System.Text.Encoding]::ASCII.GetString($data, 0, 4)
    if ($magic -ne 'GSLB') { throw 'Formato de respaldo no reconocido (magic invalido).' }
    $version = [BitConverter]::ToInt16($data, 4)
    if ($version -ne 1) { throw "Version de respaldo no soportada: $version" }
    $saltLen = [BitConverter]::ToInt16($data, 6)
    if ($saltLen -lt 16 -or $saltLen -gt 64) { throw 'Longitud de sal invalida.' }
    $minLen = 8 + $saltLen + 16 + 32
    if ($data.Length -lt $minLen) { throw 'Archivo de respaldo truncado.' }

    $salt = New-Object byte[] $saltLen
    [System.Array]::Copy($data, 8, $salt, 0, $saltLen)

    $ivStart = 8 + $saltLen
    $iv = New-Object byte[] 16
    [System.Array]::Copy($data, $ivStart, $iv, 0, 16)

    $ctStart = $ivStart + 16
    $ctLen = $data.Length - $ctStart - 32
    $cipherText = New-Object byte[] $ctLen
    [System.Array]::Copy($data, $ctStart, $cipherText, 0, $ctLen)

    $storedHmac = New-Object byte[] 32
    [System.Array]::Copy($data, $data.Length - 32, $storedHmac, 0, 32)

    # 2. Derivar claves con PBKDF2-HMAC-SHA256 (criptografía de .NET)
    $passwordBytes = [System.Text.Encoding]::UTF8.GetBytes($Password)
    $kdf = [System.Security.Cryptography.Rfc2898DeriveBytes]::new($passwordBytes, $salt, $encIter, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
    $encKey = $kdf.GetBytes(32)
    $macKey = $kdf.GetBytes(32)

    # 3. Verificar HMAC-SHA256 ANTES de descifrar (integridad)
    $mac = [System.Security.Cryptography.HMACSHA256]::new($macKey)
    $ivAndCt = $iv + $cipherText
    $computedHmac = $mac.ComputeHash($ivAndCt)
    $hmacOk = $true
    for ($i = 0; $i -lt 32; $i++) { if ($storedHmac[$i] -ne $computedHmac[$i]) { $hmacOk = $false } }
    if (-not $hmacOk) {
        Write-Log "ERROR: HMAC no coincide. El archivo pudo ser alterado o la contrasena es incorrecta."
        throw 'Error de integridad: HMAC no coincide. Contraseña incorrecta o archivo alterado.'
    }

    # 4. Descifrar AES-256-CBC con clave cruda (no contraseña en cmdline)
    $encKeyHex = [BitConverter]::ToString($encKey).Replace('-','').ToLower()
    $ivHex = [BitConverter]::ToString($iv).Replace('-','').ToLower()
    $opensslTmpIn = Join-Path $tempDir "openssl_in_${timestamp}.bin"
    [System.IO.File]::WriteAllBytes($opensslTmpIn, $cipherText)
    & $opensslPath enc -d -aes-256-cbc -K $encKeyHex -iv $ivHex -in $opensslTmpIn -out $decryptedSqlFile 2>&1
    $decryptExitCode = $LASTEXITCODE
    if ($decryptExitCode -ne 0 -or -not (Test-Path $decryptedSqlFile)) {
        throw 'Fallo al descifrar el respaldo.'
    }

    # 5. Restaurar mediante el cliente mysql (stdin desde archivo temporal)
    $mysqlPwd = $env:MYSQL_PWD
    if ($dotenv.ContainsKey('DB_PASSWORD') -and $dotenv['DB_PASSWORD']) { $env:MYSQL_PWD = $dotenv['DB_PASSWORD'] }
    $errFile = Join-Path $tempDir "mysql_err_${timestamp}.txt"
    try {
        Write-Log "INICIO: restauración de $DbName desde $BackupFile"
        Write-Host "Restaurando respaldo en $DbName ..." -ForegroundColor Cyan
        $mysqlArgs = @("-h", $DbHost, "-P", $Port, "-u", $User, $DbName)
        $p = Start-Process -FilePath $mysqlPath -ArgumentList $mysqlArgs `
            -RedirectStandardInput $decryptedSqlFile `
            -RedirectStandardError $errFile `
            -NoNewWindow -Wait -PassThru
        $restoreExitCode = $p.ExitCode
        if (-not $restoreExitCode -or $restoreExitCode -ne 0) {
            $errContent = if (Test-Path $errFile) { Get-Content $errFile -Raw } else { '' }
            throw "Fallo al restaurar la base de datos (codigo: $restoreExitCode). $errContent"
        }
    } finally {
        if ($null -ne $mysqlPwd) { $env:MYSQL_PWD = $mysqlPwd }
        else { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
    }

    if ($restoreExitCode -ne 0) {
        throw "Fallo al restaurar la base de datos (codigo de salida: $restoreExitCode)."
    }

    Write-Log "Restauración completada exitosamente: $BackupFile"
    Write-Host "Restauración completada correctamente." -ForegroundColor Green
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    throw "Error al restaurar: $($_.Exception.Message)"
}
finally {
    # 6. Limpieza de archivos temporales SIEMPRE
    foreach ($f in @($decryptedSqlFile, $opensslTmpIn, $errFile)) {
        if ($f -and (Test-Path $f)) { Remove-Item $f -Force -ErrorAction SilentlyContinue }
    }
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
    if ($Password) { $Password = '' }
}
