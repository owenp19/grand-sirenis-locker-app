<?php
/** Inspect-users.php · Grand Sirenis Locker App
 * Solo lectura: lista los usuarios actuales en sirenis_locker_db.users.
 * No modifica nada. Ejecutar desde CLI solo.
 */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    header('HTTP/1.1 403 Acceso no autorizado');
    exit('Este script solo puede ejecutarse desde la línea de comandos.');
}
require_once dirname(__DIR__) . '/private/bootstrap.php';

/**
 * Solo lectura: lista los usuarios actuales en sirenis_locker_db.users.
 * No modifica nada. Ejecutar antes de cualquier operación destructiva.
 */
try {
    $pdo = db();
    $dbName = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
    $stmt = $pdo->query("SELECT id, username, display_name, role, created_at, last_login_at FROM users ORDER BY id");
    $users = $stmt->fetchAll();

    echo "Usuarios encontrados en {$dbName}.users:\n";
    echo str_repeat('-', 90) . "\n";
    if (empty($users)) {
        echo "(ninguno)\n";
    } else {
        foreach ($users as $u) {
            printf(
                "ID: %d | Usuario: %-25s | Nombre: %-30s | Rol: %-14s | Creado: %s | Último acceso: %s\n",
                (int)$u['id'],
                $u['username'],
                $u['display_name'],
                $u['role'],
                $u['created_at'] ?? '—',
                $u['last_login_at'] ?? '—'
            );
        }
    }
    echo str_repeat('-', 90) . "\n";
    echo "Total: " . count($users) . " usuario(s)\n";
} catch (Throwable $e) {
    error_log('inspect-users: ' . $e->getMessage());
    echo "Error al consultar usuarios: " . $e->getMessage() . "\n";
    exit(1);
}