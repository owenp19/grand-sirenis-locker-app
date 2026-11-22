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

return [
    'db_host' => $env('DB_HOST', '127.0.0.1'),
    'db_port' => (int) $env('DB_PORT', '3306'),
    'db_name' => $env('DB_NAME', 'sirenis_locker_db'),
    'db_user' => $env('DB_USER', 'owenpusey'),
    'db_password' => $env('DB_PASSWORD', ''),
    'time_zone' => $env('TIME_ZONE', 'America/Bogota'),
];
