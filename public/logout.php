<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/private/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !csrf_valid((string) ($_POST['csrf'] ?? ''))) {
    http_response_code(403);
    exit('Operación rechazada.');
}
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $params['path'],
        'domain' => $params['domain'],
        'secure' => (bool) $params['secure'],
        'httponly' => (bool) $params['httponly'],
        'samesite' => 'Lax',
    ]);
}
session_destroy();
header('Location: login.php');
exit;
