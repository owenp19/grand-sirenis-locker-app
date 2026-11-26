<?php
declare(strict_types=1);

$cfg = require __DIR__ . '/config.php';
date_default_timezone_set($cfg['time_zone'] ?? 'America/Bogota');
ini_set('display_errors', '0');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.use_trans_sid', '0');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.gc_maxlifetime', '14400');

$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_name('LOCKERS_HOTEL_SESSION');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
header('Cache-Control: private, no-store');
if (!empty($isHttps)) header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'");

function config(): array { return $GLOBALS['cfg']; }
function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $c = config();
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['db_host'], $c['db_port'], $c['db_name']);
    $pdo = new PDO($dsn, $c['db_user'], $c['db_password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '-05:00'");
    return $pdo;
}
function ulen(string $v): int { if (function_exists('mb_strlen')) return mb_strlen($v, 'UTF-8'); preg_match_all('/./us', $v, $matches); return count($matches[0]); }
function user_initial(string $v): string { preg_match('/^./us', trim($v), $m); $first=$m[0]??'?'; return function_exists('mb_strtoupper') ? mb_strtoupper($first, 'UTF-8') : strtoupper($first); }
function h(mixed $v): string { return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function csrf_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}
function csrf_valid(string $value): bool { return hash_equals(csrf_token(), $value); }
function current_user(): ?array {
    if (empty($_SESSION['user']) || !is_array($_SESSION['user'])) return null;
    $now = time();
    // Expiración por inactividad (4 h) y expiración absoluta de la sesión (12 h).
    $started = (int) ($_SESSION['started_at'] ?? $now);
    if ($started > 0 && ($now - $started) > 12 * 3600) {
        unset($_SESSION['user'], $_SESSION['last_seen'], $_SESSION['started_at']);
        return null;
    }
    if (($now - (int) ($_SESSION['last_seen'] ?? 0)) > 4 * 3600) {
        unset($_SESSION['user'], $_SESSION['last_seen'], $_SESSION['started_at']);
        return null;
    }
    $_SESSION['last_seen'] = $now;
    return $_SESSION['user'];
}
/**
 * Autorización por rol leída de MySQL (no de la sesión).
 * Evita que un usuario degradado conserve privilegios hasta cerrar sesión.
 * Se resuelve una sola vez por petición.
 */
function is_admin(): bool {
    static $resolved = null;
    if ($resolved !== null) return $resolved;
    $sessionUser = $_SESSION['user'] ?? null;
    if (!is_array($sessionUser)) return $resolved = false;
    try {
        $q = db()->prepare('SELECT role FROM users WHERE id = ? LIMIT 1');
        $q->execute([(int) ($sessionUser['id'] ?? 0)]);
        $role = $q->fetchColumn();
        if (!is_string($role) || $role === '') {
            // La cuenta ya no existe: se invalida la sesión.
            unset($_SESSION['user'], $_SESSION['last_seen'], $_SESSION['started_at']);
            return $resolved = false;
        }
        $_SESSION['user']['role'] = $role;
        return $resolved = ($role === 'administrador');
    } catch (Throwable $e) {
        // Fail-closed: si no se puede verificar MySQL, no conceder privilegios.
        error_log('LockerFlow role check: ' . $e->getMessage());
        unset($_SESSION['user'], $_SESSION['last_seen'], $_SESSION['started_at']);
        return $resolved = false;
    }
}
function require_login(bool $asJson = false): array {
    $u = current_user();
    if ($u !== null) return $u;
    if ($asJson) respond(['ok'=>false, 'message'=>'Tu sesión terminó. Ingresa de nuevo.'], 401);
    header('Location: login.php');
    exit;
}
function respond(array $payload, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function fail(string $message, int $status = 422): never { respond(['ok'=>false, 'message'=>$message], $status); }
function field(array $body, string $key, int $max = 160, bool $required = false): string {
    $v = trim((string) ($body[$key] ?? ''));
    if ($required && $v === '') fail("Falta completar: $key.");
    if (ulen($v) > $max) fail("El campo $key supera el límite permitido.");
    return $v;
}
function valid_date(string $s, bool $required = false): ?string {
    if ($s === '') { if ($required) fail('Debes seleccionar una fecha.'); return null; }
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $s);
    if (!$d || $d->format('Y-m-d') !== $s) fail('La fecha ingresada no es válida.');
    return $s;
}
function safe_user_agent(): bool {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    return $ip === '127.0.0.1' || $ip === '::1';
}

/**
 * Limitador de intentos de acceso del lado servidor (archivo con bloqueo).
 * No depende de la sesión: limpiar cookies no reinicia el contador.
 * Si el almacenamiento no está disponible, no bloquea el acceso (fail-open).
 */
function throttle_mutate(callable $fn): mixed {
    $dir = __DIR__ . '/runtime';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return null;
    $handle = @fopen($dir . '/login-throttle.json', 'c+');
    if ($handle === false) return null;
    try {
        if (!flock($handle, LOCK_EX)) return null;
        $raw = stream_get_contents($handle);
        $data = json_decode((string) $raw, true);
        if (!is_array($data)) $data = [];
        $now = time();
        foreach ($data as $key => $entry) {
            if (!is_array($entry) || ($now - (int) ($entry['t'] ?? 0)) > 86400) unset($data[$key]);
        }
        $result = $fn($data, $now);
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, (string) json_encode($data));
        fflush($handle);
        return $result[1] ?? null;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}
function login_throttle_keys(string $username): array {
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return [
        'user' => hash('sha256', 'u|' . strtolower(trim($username)) . '|' . $ip),
        'ip' => hash('sha256', 'i|' . $ip),
    ];
}
/** Segundos de espera restantes; 0 si puede intentar. */
function login_throttle_wait(string $username): int {
    $keys = login_throttle_keys($username);
    $limits = ['user' => 8, 'ip' => 40];
    $wait = throttle_mutate(static function (array &$data, int $now) use ($keys, $limits): array {
        $max = 0;
        foreach ($keys as $kind => $key) {
            $entry = $data[$key] ?? null;
            if (!is_array($entry)) continue;
            $start = (int) ($entry['t'] ?? 0);
            if (($now - $start) < 900 && (int) ($entry['c'] ?? 0) >= $limits[$kind]) {
                $max = max($max, 900 - ($now - $start));
            }
        }
        return [$data, $max];
    });
    return max(0, (int) $wait);
}
function login_throttle_fail(string $username): void {
    $keys = login_throttle_keys($username);
    throttle_mutate(static function (array &$data, int $now) use ($keys): array {
        foreach ($keys as $key) {
            $entry = $data[$key] ?? null;
            if (!is_array($entry) || ($now - (int) ($entry['t'] ?? 0)) >= 900) {
                $data[$key] = ['c' => 1, 't' => $now];
            } else {
                $data[$key] = ['c' => (int) $entry['c'] + 1, 't' => (int) $entry['t']];
            }
        }
        return [$data, null];
    });
}
function login_throttle_clear(string $username): void {
    $target = login_throttle_keys($username)['user'];
    throttle_mutate(static function (array &$data, int $now) use ($target): array {
        unset($data[$target]);
        return [$data, null];
    });
}
