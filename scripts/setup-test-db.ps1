#requires -Version 5.1
<#
.SINOPSIS
    Crea o reinicia la base de datos aislada de pruebas (hotel_lockers_test).

.DESCRIPCIÓN
    Copia esquema y datos demo desde sirenis_locker_db con mysqldump y otorga al
    usuario de aplicacion solo SELECT/INSERT/UPDATE/DELETE sobre la base de
    pruebas. Requiere privilegios administrativos de MySQL (root local).

.NOTAS
    La base destino debe terminar en _test o _e2e para evitar accidentes.
    No toca la base de desarrollo. No imprime contrasenas.
#>
[CmdletBinding()]
param(
    [string]$SourceDb = 'sirenis_locker_db',
    [string]$TestDb = 'hotel_lockers_test',
    [string]$RootUser = 'root',
    [switch]$KeepExisting,
    [switch]$Force
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

if ($TestDb -notmatch '_(test|e2e)$' -and -not $Force) {
    throw "La base destino '$TestDb' no termina en _test/_e2e. Usa -Force solo si estas seguro."
}
if ($TestDb -eq $SourceDb) {
    throw 'La base de pruebas no puede ser la misma que la base de desarrollo.'
}

$bin = 'C:\xampp\mysql\bin'
$mysql = Join-Path $bin 'mysql.exe'
$mysqldump = Join-Path $bin 'mysqldump.exe'
if (-not (Test-Path $mysql)) { $mysql = (Get-Command mysql -ErrorAction Stop).Source }
if (-not (Test-Path $mysqldump)) { $mysqldump = (Get-Command mysqldump -ErrorAction Stop).Source }

$dotenv = Read-DotEnv (Join-Path $root '.env')
$appUser = if ($dotenv.ContainsKey('DB_USER') -and $dotenv['DB_USER']) { $dotenv['DB_USER'] } else { 'owenpusey' }
if ($appUser -notmatch '^[A-Za-z0-9_.-]+$') { throw 'Nombre de usuario de aplicacion invalido en .env' }

$rootPassword = $env:MYSQL_ROOT_PWD
if (-not $rootPassword -and $dotenv.ContainsKey('MYSQL_ROOT_PWD')) { $rootPassword = $dotenv['MYSQL_ROOT_PWD'] }
$previousPassword = $env:MYSQL_PWD
$dump = Join-Path $env:TEMP "lockerflow_testdb_$([guid]::NewGuid().ToString('N')).sql"

try {
    if ($rootPassword) { $env:MYSQL_PWD = $rootPassword }
    else { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }

    Write-Host "Respaldando base origen '$SourceDb'..." -ForegroundColor Cyan
    & $mysqldump -u $RootUser --single-transaction --no-tablespaces --skip-lock-tables --result-file=$dump $SourceDb 2>&1
    if ($LASTEXITCODE -ne 0) { throw "No se pudo leer la base '$SourceDb'." }

    if (-not $KeepExisting) {
        Write-Host "Recreando base de pruebas '$TestDb'..." -ForegroundColor Cyan
        & $mysql -u $RootUser -e "DROP DATABASE IF EXISTS ``$TestDb``; CREATE DATABASE ``$TestDb`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1
        if ($LASTEXITCODE -ne 0) { throw "No se pudo recrear '$TestDb'." }
    }

    Write-Host 'Importando datos...' -ForegroundColor Cyan
    cmd /c "`"$mysql`" -u $RootUser `"$TestDb`" < `"$dump`"" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Fallo la importacion en '$TestDb'." }

    Write-Host "Otorgando privilegios minimos a '$appUser'..." -ForegroundColor Cyan
    & $mysql -u $RootUser -e "GRANT SELECT, INSERT, UPDATE, DELETE ON ``$TestDb``.* TO '$appUser'@'%'; FLUSH PRIVILEGES;" 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron otorgar los privilegios de prueba.' }

    $counts = & $mysql -u $RootUser -N -e "SELECT (SELECT COUNT(*) FROM ``$TestDb``.lockers), (SELECT COUNT(*) FROM ``$TestDb``.users), (SELECT COUNT(*) FROM ``$TestDb``.movements);" 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar la base de pruebas.' }
    Write-Host "Base de pruebas lista. Lockers/Usuarios/Movimientos: $counts" -ForegroundColor Green
} finally {
    if ($null -ne $previousPassword) { $env:MYSQL_PWD = $previousPassword }
    else { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
    if (Test-Path $dump) { Remove-Item $dump -Force }
}
