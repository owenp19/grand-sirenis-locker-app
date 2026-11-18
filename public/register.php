<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/private/bootstrap.php';

$error = '';
$success = '';
$ready = false;
$initial = false;
$allowed = false;
$actor = current_user();
$name = trim((string) ($_POST['display_name'] ?? ''));
$username = trim((string) ($_POST['username'] ?? ''));
$role = trim((string) ($_POST['role'] ?? 'operador'));

try {
    $pdo = db();
    $count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $initial = $count === 0;
    $ready = true;
    if ($initial) {
        // La primera cuenta solo puede crearse en el mismo equipo que ejecuta PHP.
        $allowed = safe_user_agent();
    } elseif ($actor !== null) {
        // Autorizar desde MySQL, no únicamente desde un rol almacenado en la sesión.
        $q = $pdo->prepare('SELECT role FROM users WHERE id = ? LIMIT 1');
        $q->execute([(int) $actor['id']]);
        $allowed = $q->fetchColumn() === 'administrador';
    }
} catch (Throwable $e) {
    error_log('LockerFlow register connection: ' . $e->getMessage());
    $error = 'No se pudo verificar la base de datos. En una instalación nueva importa db/schema.sql; si ya usabas LockerFlow, importa db/migrations/001_roles_usuarios.sql.';
}

if ($ready && !$allowed) {
    http_response_code(403);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $ready && $allowed) {
    if (!csrf_valid((string) ($_POST['csrf'] ?? ''))) {
        $error = 'El formulario venció. Recarga la página.';
    } elseif (!preg_match('/^[a-zA-Z0-9_.-]{3,40}$/D', $username)) {
        $error = 'El usuario debe tener entre 3 y 40 caracteres: letras, números, punto, guion o subrayado.';
    } elseif (ulen($name) < 2 || ulen($name) > 120) {
        $error = 'Escribe el nombre completo del responsable (2 a 120 caracteres).';
    } elseif (!$initial && !in_array($role, ['administrador', 'operador'], true)) {
        $error = 'Selecciona un rol permitido.';
    } else {
        $password = (string) ($_POST['password'] ?? '');
        $confirm = (string) ($_POST['password_confirm'] ?? '');
        if (strlen($password) < 12 || strlen($password) > 128) {
            $error = 'La contraseña debe tener de 12 a 128 caracteres.';
        } elseif (!hash_equals($password, $confirm)) {
            $error = 'Las contraseñas no coinciden.';
        } else {
            $lock = false;
            try {
                if ($initial) {
                    // Evita dos administradores iniciales creados simultáneamente.
                    $lock = (int) $pdo->query("SELECT GET_LOCK('lockerflow_first_user', 8)")->fetchColumn() === 1;
                    if (!$lock) throw new RuntimeException('No se pudo obtener el bloqueo inicial.');
                    if ((int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn() !== 0) {
                        throw new RuntimeException('La cuenta inicial ya fue creada.');
                    }
                } else {
                    // Comprobación nueva ante una posible revocación mientras el formulario está abierto.
                    $q = $pdo->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
                    $q->execute([(int) $actor['id']]);
                    if ($q->fetchColumn() !== 'administrador') throw new RuntimeException('Acceso denegado.');
                }
                $assignedRole = $initial ? 'administrador' : $role;
                $insert = $pdo->prepare('INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)');
                $insert->execute([$username, $name, password_hash($password, PASSWORD_DEFAULT), $assignedRole]);
                if ($initial) {
                    $newId = (int) $pdo->lastInsertId();
                    session_regenerate_id(true);
                    unset($_SESSION['csrf']);
                    $_SESSION['user'] = ['id' => $newId, 'username' => $username, 'name' => $name, 'role' => 'administrador'];
                    $_SESSION['last_seen'] = time();
                    header('Location: index.php'); exit;
                }
                $success = 'Cuenta creada correctamente. El nuevo usuario ya puede iniciar sesión.';
                $name = '';
                $username = '';
                $role = 'operador';
            } catch (Throwable $e) {
                error_log('LockerFlow register create: ' . $e->getMessage());
                if ($e instanceof PDOException && (string) $e->getCode() === '23000') {
                    $error = 'Ese nombre de usuario ya existe. Elige otro.';
                } elseif ($e instanceof PDOException && $e->getCode() === '42S22') {
                    $error = 'Falta actualizar la tabla de usuarios. Ejecuta db/migrations/001_roles_usuarios.sql.';
                } else {
                    $error = 'No se pudo crear el usuario. Verifica los permisos y vuelve a intentar.';
                }
            } finally {
                if ($lock) $pdo->query("SELECT RELEASE_LOCK('lockerflow_first_user')");
            }
        }
    }
}
?><!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#152b41">
    <meta name="description" content="Registro protegido de usuarios de LockerFlow.">
    <link rel="icon" href="icons/icon.svg" type="image/svg+xml">
    <link rel="manifest" href="manifest.webmanifest">
    <link rel="stylesheet" href="assets/css/app.css">
    <link rel="stylesheet" href="assets/css/auth.css">
    <script src="assets/js/auth.js" defer></script>
    <title>Crear usuario · LockerFlow</title>
</head>
<body class="auth-page auth-v2">
<main class="auth-shell register-layout">
    <aside class="auth-showcase" aria-label="Sobre LockerFlow">
        <a class="auth-logo" href="<?= $actor ? 'index.php' : 'login.php' ?>"><span class="auth-logo-icon"><img src="icons/icon.svg" alt=""></span><span><strong>LockerFlow</strong><small>GESTIÓN HOTELERA</small></span></a>
        <div class="showcase-content">
            <span class="auth-tag"><span class="live-dot"></span> ACCESOS CONTROLADOS</span>
            <h1>Tu equipo,<br><em>conectado.</em></h1>
            <p>Un usuario por responsable. Las operaciones del inventario quedan registradas con la cuenta que las realiza.</p>
            <div class="showcase-art" aria-hidden="true">
                <div class="team-sample">
                    <div class="team-header"><span class="team-title">PERSONAL AUTORIZADO</span><span class="team-check">✓</span></div>
                    <div class="team-line"><span class="team-avatar first">A</span><span class="team-person"><b>Administrador</b><small>Gestión de usuarios y lockers</small></span><span class="team-pill">Admin</span></div>
                    <div class="team-line"><span class="team-avatar second">O</span><span class="team-person"><b>Operador</b><small>Gestión diaria de lockers</small></span><span class="team-pill muted">Equipo</span></div>
                    <div class="team-seal">🔒 &nbsp; Registro protegido</div>
                </div>
            </div>
        </div>
        <div class="showcase-bottom"><span>◈ Tus datos permanecen en MySQL local</span><span>Control de accesos</span></div>
    </aside>
    <section class="auth-panel" aria-labelledby="register-title">
        <div class="auth-panel-inner">
            <div class="auth-mobile-logo"><img src="icons/icon.svg" alt=""><strong>LockerFlow</strong></div>
            <span class="form-overline"><?= $initial ? 'PRIMERA CONFIGURACIÓN' : 'GESTIÓN DE ACCESOS' ?></span>
            <h2 id="register-title"><?= $initial ? 'Crea tu cuenta' : 'Nuevo usuario' ?> <span class="hi-mark">✦</span></h2>
            <p class="form-intro"><?= $initial ? 'Configura el primer administrador para empezar a administrar tus lockers.' : 'Registra un integrante de tu equipo con su propio acceso.' ?></p>
            <?php if ($error !== ''): ?><div class="auth-alert error" role="alert"><span aria-hidden="true">!</span><span><?= h($error) ?></span></div><?php endif; ?>
            <?php if ($success !== ''): ?><div class="auth-alert success" role="status"><span aria-hidden="true">✓</span><span><?= h($success) ?></span></div><?php endif; ?>
            <?php if ($ready && $allowed): ?>
            <form method="post" class="auth-form register-form" autocomplete="on">
                <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
                <div class="auth-field"><label for="display_name">Nombre completo</label><div class="input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.3-3.5 2.5-5.2 6.5-5.2s6.2 1.7 6.5 5.2"/></svg><input type="text" id="display_name" name="display_name" value="<?= h($name) ?>" placeholder="Ej. María Rodríguez" autocomplete="name" maxlength="120" required autofocus></div></div>
                <div class="auth-field"><label for="username">Nombre de usuario</label><div class="input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 16 5M8 5h8v8"/><path d="M6 19h12"/></svg><input type="text" id="username" name="username" value="<?= h($username) ?>" placeholder="Ej. maria.seguridad" maxlength="40" minlength="3" pattern="[A-Za-z0-9_.-]{3,40}" title="3 a 40 caracteres: letras, números, punto, guion y subrayado" autocomplete="username" autocapitalize="none" spellcheck="false" required></div></div>
                <?php if (!$initial): ?><div class="auth-field"><label for="role">Permisos de la cuenta</label><div class="input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 6-3 9-8 11-5-2-8-5-8-11V5l8-3z"/><path d="m9 12 2 2 4-4"/></svg><select id="role" name="role" required><option value="operador" <?= $role === 'operador' ? 'selected' : '' ?>>Operador · Administrar lockers</option><option value="administrador" <?= $role === 'administrador' ? 'selected' : '' ?>>Administrador · También crear usuarios</option></select></div></div><?php else: ?><div class="role-notice">✓ La primera cuenta tendrá permisos de <strong>Administrador</strong>.</div><?php endif; ?>
                <div class="auth-field"><label for="password">Contraseña</label><div class="input-wrap password-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input type="password" id="password" name="password" autocomplete="new-password" minlength="12" maxlength="128" placeholder="Mínimo 12 caracteres" required><button type="button" class="toggle-password" data-toggle-password="password" aria-label="Mostrar contraseña" aria-pressed="false">Mostrar</button></div><small class="field-caption">Utiliza 12 caracteres o más. Evita claves compartidas.</small></div>
                <div class="auth-field"><label for="password_confirm">Confirmar contraseña</label><div class="input-wrap password-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 4 0 0 1 8 0v3"/></svg><input type="password" id="password_confirm" name="password_confirm" autocomplete="new-password" minlength="12" maxlength="128" placeholder="Repite tu contraseña" required><button type="button" class="toggle-password" data-toggle-password="password_confirm" aria-label="Mostrar confirmación de contraseña" aria-pressed="false">Mostrar</button></div><small class="field-caption" id="password-match" aria-live="polite"></small></div>
                <button class="auth-submit" type="submit"><?= $initial ? 'Crear administrador y entrar' : 'Guardar nuevo usuario' ?> <span aria-hidden="true">→</span></button>
            </form>
            <?php elseif ($ready): ?><div class="auth-restricted"><div class="restricted-symbol">🔒</div><strong>Registro protegido</strong><p><?= $initial ? 'El primer administrador solo puede registrarse en el mismo computador donde se ejecuta PHP (localhost).' : 'Solo un administrador con sesión iniciada puede crear nuevas cuentas. Ingresa con un administrador para continuar.' ?></p><a class="btn btn-primary" href="login.php">Ir a iniciar sesión →</a></div><?php endif; ?>
            <div class="auth-switch"><?= $actor ? '¿Terminaste?' : '¿Ya tienes cuenta?' ?> <a href="<?= $actor ? 'index.php' : 'login.php' ?>"><?= $actor ? 'Volver al dashboard' : 'Inicia sesión' ?></a></div>
            <div class="auth-local-note"><span class="auth-note-icon">⌁</span><span><?= $initial ? 'Cuenta inicial disponible únicamente desde localhost. No se permite el registro público una vez creada.' : 'Solo los administradores pueden registrar personal nuevo. No se alteran los lockers existentes.' ?></span></div>
        </div>
        <div class="auth-panel-footer"><span>© <?= date('Y') ?> LockerFlow</span><span>Accesos seguros · Base de datos local</span></div>
    </section>
</main>
</body>
</html>
