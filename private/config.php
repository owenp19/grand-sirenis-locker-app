<?php
/**
 * Configuración de conexión — Grand Sirenis Locker App.
 *
 * Lee variables de entorno o un archivo `.env` en la raíz del proyecto
 * (no versionado). Este archivo NO contiene credenciales reales.
 *
 * Para configurar: copia `.env.example` a `.env` y ajusta los valores.
 */

// Cargador mínimo de .env, sin dependencias. No sobreescribe variables ya definidas.
(static function (string $file): void {
    if (!is_file($file) || !is_readable($file)) {
        return;
    }
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        $pos = strpos($line, '=');
        if ($pos === false) {
            continue;
        }
        $key = trim(substr($line, 0, $pos));
        $val = trim(substr($line, $pos + 1));
        if ($key === '') {
            continue;
        }
        // Quitar comillas envolventes simples o dobles.
        if (strlen($val) >= 2 && (($val[0] === '"' && $val[strlen($val) - 1] === '"') || ($val[0] === "'" && $val[strlen($val) - 1] === "'"))) {
            $val = substr($val, 1, -1);
        }
        if (getenv($key) === false) {
            putenv("$key=$val");
            $_ENV[$key] = $val;
        }
    }
})(dirname(__DIR__) . '/.env');

$env = static function (string $key, string $default = ''): string {
    $value = getenv($key);
    return ($value === false || $value === '') ? $default : $value;
};

// Valores obligatorios en producción; en desarrollo se usará .env o env del SO.
$requireProduction = []; // Puede ser seteado externamente para bloquear ejecuciones sin configuración

$dbHost = $env('DB_HOST');
$dbName = $env('DB_NAME');
$dbUser = $env('DB_USER');
$dbPass = $env('DB_PASSWORD');

if ($dbHost === '' || $dbName === '' || $dbUser === '' || $dbPass === '') {
    // En entornos sin credenciales definidas, la app no debe iniciar silenciosamente.
    // El desarrollador debe setear las vars de entorno o crear .env antes de arrancar.
    // No imprimir credenciales; solo indicar que faltan.
    header('HTTP/1.1 500 Configuración incompleta');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok'=>false,'message'=>'Faltan credenciales de base de datos (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD). Configura .env o variables de entorno.']);
    exit(1);
}

return [
    'db_host' => $dbHost,
    'db_port' => (int) $env('DB_PORT', '3306'),
    'db_name' => $dbName,
    'db_user' => $dbUser,
    'db_password' => $dbPass,
    'time_zone' => $env('TIME_ZONE', 'America/Bogota'),
];
