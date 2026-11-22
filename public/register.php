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
                    $_SESSION['started_at'] = time();
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
    <meta name="theme-color" content="#A5832E">
    <meta name="description" content="Registro protegido de usuarios de Grand Sirenis Locker App.">
    <link rel="icon" type="image/png" href="assets/image/grand-sirenis-locker-app-favicon.png">
    <link rel="manifest" href="manifest.webmanifest">
    <link rel="preload" href="assets/fonts/roboto-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="assets/image/grand-sirenis-locker-app-logo-black-720.png" as="image">
    <link rel="stylesheet" href="assets/css/theme.css">
    <link rel="stylesheet" href="assets/css/auth.css">
    <link rel="stylesheet" href="assets/css/components.css">
    <link rel="stylesheet" href="assets/css/motion.css">
    <script src="assets/js/auth.js" defer></script>
    <script src="assets/js/motion.js" defer></script>
    <title>Crear usuario · Grand Sirenis Locker App</title>
</head>
<body class="auth-page auth-v2">
<div class="boot" aria-hidden="true">
    <div class="boot-inner">
        <img class="boot-logo" src="assets/image/grand-sirenis-locker-app-logo-black-720.png" alt="" width="720" height="240" decoding="async">
        <span class="boot-bar"></span>
        <span class="boot-label">Preparando la aplicación</span>
    </div>
</div>
<main class="auth-shell register-layout">
    <aside class="auth-showcase" aria-label="Sobre Grand Sirenis Locker App">
        <a class="auth-brand" href="<?= $actor ? 'index.php' : 'welcome.php' ?>">
            <img class="auth-brand-logo" src="assets/image/grand-sirenis-locker-app-logo-black-720.png"
                 alt="Grand Sirenis Locker App" width="720" height="240" decoding="async" fetchpriority="high">
        </a>
        <div class="auth-story">
            <p class="auth-eyebrow">Accesos controlados</p>
            <p class="auth-showcase-title"><span>Tu equipo,</span><strong>conectado.</strong></p>
            <p class="auth-lead">Un usuario por responsable. Las operaciones del inventario quedan registradas con la cuenta que las realiza.</p>
        </div>
        <div class="auth-plate-wrap" aria-hidden="true">
            <div class="auth-plate">
                <div class="auth-plate-head">
                    <span class="auth-plate-title">Personal autorizado</span>
                    <span class="auth-plate-chip">2 roles</span>
                </div>
                <div class="auth-team-row">
                    <span class="auth-avatar is-admin">A</span>
                    <span class="auth-team-person"><b>Administrador</b><small>Gestión de usuarios y lockers</small></span>
                    <span class="auth-team-pill">Admin</span>
                </div>
                <div class="auth-team-row">
                    <span class="auth-avatar is-operator">O</span>
                    <span class="auth-team-person"><b>Operador</b><small>Gestión diaria de lockers</small></span>
                    <span class="auth-team-pill is-muted">Equipo</span>
                </div>
                <div class="auth-team-seal"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#lock"></use></svg>Registro protegido · Datos en MySQL local</div>
            </div>
        </div>
    </aside>
    <section class="auth-panel" aria-labelledby="register-title">
        <div class="auth-panel-inner">
            <a class="auth-back" href="<?= $actor ? 'index.php' : 'welcome.php' ?>"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#chevron-left"></use></svg><?= $actor ? 'Volver al dashboard' : 'Volver a la portada' ?></a>
            <p class="auth-eyebrow"><?= $initial ? 'Primera configuración' : 'Gestión de accesos' ?></p>
            <h1 id="register-title"><?= $initial ? 'Crea tu cuenta' : 'Nuevo usuario' ?></h1>
            <p class="auth-intro"><?= $initial ? 'Configura el primer administrador para empezar a administrar tus lockers.' : 'Registra un integrante de tu equipo con su propio acceso.' ?></p>
            <?php if ($error !== ''): ?><div class="auth-alert error" role="alert"><span aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#circle-alert"></use></svg></span><span><?= h($error) ?></span></div><?php endif; ?>
            <?php if ($success !== ''): ?><div class="auth-alert success" role="status"><span aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#check"></use></svg></span><span><?= h($success) ?></span></div><?php endif; ?>
            <?php if ($ready && $allowed): ?>
            <form method="post" class="auth-form register-form" autocomplete="on">
                <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
                <div class="auth-field" data-reveal><label for="display_name">Nombre completo</label><div class="input-wrap"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#user"></use></svg><input type="text" id="display_name" name="display_name" value="<?= h($name) ?>" placeholder="Ej. María Rodríguez" autocomplete="name" maxlength="120" required autofocus></div></div>
                <div class="auth-field" data-reveal><label for="username">Nombre de usuario</label><div class="input-wrap"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#at-sign"></use></svg><input type="text" id="username" name="username" value="<?= h($username) ?>" placeholder="Ej. maria.seguridad" maxlength="40" minlength="3" pattern="[A-Za-z0-9_.-]{3,40}" title="3 a 40 caracteres: letras, números, punto, guion y subrayado" autocomplete="username" autocapitalize="none" spellcheck="false" required></div></div>
                <?php if (!$initial): ?><div class="auth-field" data-reveal><label for="role">Permisos de la cuenta</label><div class="input-wrap"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#shield-check"></use></svg><select id="role" name="role" required><option value="operador" <?= $role === 'operador' ? 'selected' : '' ?>>Operador · Administrar lockers</option><option value="administrador" <?= $role === 'administrador' ? 'selected' : '' ?>>Administrador · También crear usuarios</option></select></div></div><?php else: ?><div class="role-notice"><svg class="icon icon-sm" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#check"></use></svg><span>La primera cuenta tendrá permisos de <strong>Administrador</strong>.</span></div><?php endif; ?>
                <div class="auth-field" data-reveal><label for="password">Contraseña</label><div class="input-wrap password-wrap"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#key-round"></use></svg><input type="password" id="password" name="password" autocomplete="new-password" minlength="12" maxlength="128" placeholder="Mínimo 12 caracteres" required><button type="button" class="toggle-password" data-toggle-password="password" aria-label="Mostrar contraseña" aria-pressed="false">Mostrar</button></div><small class="field-caption">Utiliza 12 caracteres o más. Evita claves compartidas.</small></div>
                <div class="auth-field" data-reveal><label for="password_confirm">Confirmar contraseña</label><div class="input-wrap password-wrap"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#key-round"></use></svg><input type="password" id="password_confirm" name="password_confirm" autocomplete="new-password" minlength="12" maxlength="128" placeholder="Repite tu contraseña" required><button type="button" class="toggle-password" data-toggle-password="password_confirm" aria-label="Mostrar confirmación de contraseña" aria-pressed="false">Mostrar</button></div><small class="field-caption" id="password-match" aria-live="polite"></small></div>
                <button class="auth-submit" type="submit"><?= $initial ? 'Crear administrador y entrar' : 'Guardar nuevo usuario' ?> <svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#arrow-right"></use></svg></button>
            </form>
            <?php elseif ($ready): ?><div class="auth-restricted"><div class="restricted-symbol" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#lock"></use></svg></div><strong>Registro protegido</strong><p><?= $initial ? 'El primer administrador solo puede registrarse en el mismo computador donde se ejecuta PHP (localhost).' : 'Solo un administrador con sesión iniciada puede crear nuevas cuentas. Ingresa con un administrador para continuar.' ?></p><a class="btn btn-primary" href="login.php">Ir a iniciar sesión <svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#arrow-right"></use></svg></a></div><?php endif; ?>
            <div class="auth-switch" data-reveal><?= $actor ? '¿Terminaste?' : '¿Ya tienes cuenta?' ?> <a href="<?= $actor ? 'index.php' : 'login.php' ?>"><?= $actor ? 'Volver al dashboard' : 'Inicia sesión' ?></a></div>
            <div class="auth-local-note" data-reveal><span class="auth-note-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#info"></use></svg></span><span><?= $initial ? 'Cuenta inicial disponible únicamente desde localhost. No se permite el registro público una vez creada.' : 'Solo los administradores pueden registrar personal nuevo. No se alteran los lockers existentes.' ?></span></div>
        </div>
        <div class="auth-panel-footer" data-reveal><span>© <?= date('Y') ?> Grand Sirenis Locker App</span><span>Accesos seguros · Base de datos local</span></div>
    </section>
</main>
</body>
</html>
