<?php
declare(strict_types=1);

$cfg = require __DIR__ . '/config.php';
date_default_timezone_set($cfg['time_zone'] ?? 'America/Bogota');
ini_set('display_errors', '0');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Lax');

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
header('Cache-Control: private, no-store');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'");

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
    if ((time() - (int) ($_SESSION['last_seen'] ?? 0)) > 4 * 3600) {
        unset($_SESSION['user'], $_SESSION['last_seen']);
        return null;
    }
    $_SESSION['last_seen'] = time();
    return $_SESSION['user'];
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
