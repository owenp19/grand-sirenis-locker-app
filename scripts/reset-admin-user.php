<?php
/**
 * reset-admin-user.php — Grand Sirenis Locker App
 * OPERACIÓN DESTRUCTIVA OPCIONAL: reemplaza un usuario por una cuenta administrativa.
 *
 * La contraseña NUNCA se escribe en el código ni en Git. Debe llegarse por
 * variable de entorno LOCKERFLOW_RESET_PASSWORD (mínimo 12 caracteres).
 *
 * REQUISITOS ANTES DE EJECUTAR:
 *   1. Respaldo reciente: scripts/backup-database.ps1
 *   2. Revisar usuarios actuales: php scripts/inspect-users.php
 *   3. Autorización expresa del responsable de la base.
 *
 * Uso:
 *   $env:LOCKERFLOW_RESET_PASSWORD = 'ClaveLargaDe12+'
 *   php scripts/reset-admin-user.php --user=cuenta.deseada --role=administrador
 *   php scripts/reset-admin-user.php --user=cuenta.deseada --delete=cuenta.vieja
 *
 * Sin --delete no borra nada; solo crea la cuenta si no existe.
 */
declare(strict_types=1);

require_once dirname(__DIR__) . '/private/bootstrap.php';

$options = getopt('', ['user:', 'delete::', 'role::', 'name::']);
$newUsername = trim((string) ($options['user'] ?? ''));
$deleteUsername = isset($options['delete']) ? trim((string) $options['delete']) : null;
$newRole = trim((string) ($options['role'] ?? 'administrador'));
$newDisplayName = trim((string) ($options['name'] ?? 'Responsable'));
$newPassword = (string) (getenv('LOCKERFLOW_RESET_PASSWORD') ?: '');

if ($newUsername === '') {
    fwrite(STDERR, "Falta --user=cuenta.deseada\n");
    exit(2);
}
if (strlen($newUsername) > 60) {
    fwrite(STDERR, "El usuario supera 60 caracteres.\n");
    exit(2);
}
if (!in_array($newRole, ['administrador', 'operador'], true)) {
    fwrite(STDERR, "Rol inválido. Usa administrador u operador.\n");
    exit(2);
}
if (strlen($newPassword) < 12 || strlen($newPassword) > 128) {
    fwrite(STDERR, "Define LOCKERFLOW_RESET_PASSWORD con 12 a 128 caracteres.\n");
    exit(2);
}

echo "============================================================\n";
echo "  OPERACIÓN SOBRE sirenis_locker_db (requiere respaldo previo)\n";
echo "============================================================\n";
echo "Cuenta a crear/actualizar: $newUsername (rol: $newRole)\n";
echo 'Cuenta a eliminar: ' . ($deleteUsername === null || $deleteUsername === '' ? '(ninguna)' : $deleteUsername) . "\n\n";

try {
    $pdo = db();
    $users = $pdo->query('SELECT id, username, display_name, role FROM users ORDER BY id')->fetchAll();
    echo 'Usuarios actuales: ' . count($users) . "\n";
    foreach ($users as $u) {
        echo "  ID:{$u['id']} | {$u['username']} | {$u['display_name']} | {$u['role']}\n";
    }
    if (count($users) === 0 && $newRole !== 'administrador') {
        // La primera cuenta del sistema debe ser administradora.
        $newRole = 'administrador';
        echo "Aviso: primera cuenta del sistema; se asigna rol administrador.\n";
    }

    $pdo->beginTransaction();

    if ($deleteUsername !== null && $deleteUsername !== '') {
        if ($deleteUsername === $newUsername) {
            throw new RuntimeException('La cuenta a borrar y la nueva no pueden ser la misma.');
        }
        $del = $pdo->prepare('DELETE FROM users WHERE username = ?');
        $del->execute([$deleteUsername]);
        echo 'Usuarios eliminados: ' . $del->rowCount() . "\n";
    }

    $exists = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $exists->execute([$newUsername]);
    $existingId = $exists->fetchColumn();
    $hash = password_hash($newPassword, PASSWORD_DEFAULT);

    if ($existingId !== false && $existingId !== null) {
        $upd = $pdo->prepare('UPDATE users SET display_name = ?, password_hash = ?, role = ? WHERE id = ?');
        $upd->execute([$newDisplayName, $hash, $newRole, (int) $existingId]);
        echo "Cuenta actualizada: $newUsername\n";
    } else {
        $ins = $pdo->prepare('INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)');
        $ins->execute([$newUsername, $newDisplayName, $hash, $newRole]);
        echo "Cuenta creada: $newUsername (ID " . (int) $pdo->lastInsertId() . ")\n";
    }

    $pdo->commit();
    echo "Operación completada. No se imprimió ninguna contraseña.\n";
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('reset-admin-user: ' . $e->getMessage());
    fwrite(STDERR, 'Error: ' . $e->getMessage() . "\n");
    exit(1);
}
