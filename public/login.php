<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/private/bootstrap.php';
if (current_user()) { header('Location: index.php'); exit; }
$error = '';
$username = '';
$success = isset($_GET['created']) ? 'Cuenta creada correctamente. Ya puedes ingresar.' : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');
    if (!csrf_valid((string) ($_POST['csrf'] ?? ''))) {
        $error = 'El formulario venció. Actualiza la página e inténtalo otra vez.';
    } else {
        $wait = login_throttle_wait($username);
        if ($wait > 0) {
            $error = 'Demasiados intentos fallidos. Inténtalo de nuevo en ' . max(1, (int) ceil($wait / 60)) . ' minuto(s).';
        } elseif ($username === '' || $password === '' || strlen($username) > 60 || strlen($password) > 512) {
            $error = 'Introduce un usuario y una contraseña válidos.';
        } else {
            try {
                $q = db()->prepare('SELECT id, username, display_name, password_hash, role FROM users WHERE username = ? LIMIT 1');
                $q->execute([$username]);
                $account = $q->fetch();
                // Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe.
                $dummyHash = '$2y$10$jBwtvLLlmuFDOc3dhP0uNOwo64o6Dca6JuLol7B/xH.gVt06G74PK';
                $valid = password_verify($password, $account ? (string) $account['password_hash'] : $dummyHash);
                if ($account && $valid) {
                    session_regenerate_id(true);
                    unset($_SESSION['csrf']);
                    $_SESSION['user'] = [
                        'id' => (int) $account['id'],
                        'username' => (string) $account['username'],
                        'name' => (string) $account['display_name'],
                        'role' => (string) $account['role'],
                    ];
                    $_SESSION['last_seen'] = time();
                    $_SESSION['started_at'] = time();
                    login_throttle_clear($username);
                    db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([(int) $account['id']]);
                    header('Location: index.php'); exit;
                }
                login_throttle_fail($username);
                $error = 'Usuario o contraseña incorrectos.';
            } catch (Throwable $e) {
                error_log('LockerFlow login: ' . $e->getMessage());
                $error = $e instanceof PDOException && $e->getCode() === '42S22'
                    ? 'Falta actualizar la base de datos. Ejecuta db/migrations/001_roles_usuarios.sql.'
                    : 'No se pudo consultar MySQL. Verifica que esté activo y configurado.';
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
    <meta name="description" content="Acceso privado al sistema local de gestión de lockers del hotel.">
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
    <title>Iniciar sesión · Grand Sirenis Locker App</title>
</head>
<body class="auth-page auth-v2">
<div class="boot" aria-hidden="true">
    <div class="boot-inner">
        <img class="boot-logo" src="assets/image/grand-sirenis-locker-app-logo-black-720.png" alt="" width="720" height="240" decoding="async">
        <span class="boot-bar"></span>
        <span class="boot-label">Preparando la aplicación</span>
    </div>
</div>
<main class="auth-shell">
    <aside class="auth-showcase" aria-label="Sobre Grand Sirenis Locker App">
        <a class="auth-brand" href="welcome.php">
            <img class="auth-brand-logo" src="assets/image/grand-sirenis-locker-app-logo-black-720.png"
                 alt="Grand Sirenis Locker App" width="720" height="240" decoding="async" fetchpriority="high">
        </a>
        <div class="auth-story">
            <p class="auth-eyebrow">Gestión hotelera · Uso interno</p>
            <p class="auth-showcase-title"><span>Cada locker</span><strong>en su lugar.</strong></p>
            <p class="auth-lead">Controla las asignaciones, consulta la disponibilidad y conserva el registro de cada movimiento.</p>
        </div>
        <div class="auth-plate-wrap" aria-hidden="true">
            <div class="auth-plate">
                <div class="auth-plate-head">
                    <span class="auth-plate-title">Inventario de lockers</span>
                    <span class="auth-plate-chip">13 bloques</span>
                </div>
                <div class="auth-tiles">
                    <span class="auth-tile is-used"></span><span class="auth-tile is-used"></span><span class="auth-tile"></span>
                    <span class="auth-tile is-used"></span><span class="auth-tile is-warn"></span><span class="auth-tile"></span>
                    <span class="auth-tile"></span><span class="auth-tile is-used"></span><span class="auth-tile"></span>
                </div>
                <div class="auth-plate-foot">
                    <span><i class="auth-dot is-free"></i>Disponible</span>
                    <span><i class="auth-dot is-used"></i>Asignado</span>
                    <span><i class="auth-dot is-warn"></i>Atención</span>
                </div>
            </div>
            <div class="auth-float is-secure"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#shield-check"></use></svg>Acceso protegido</div>
            <div class="auth-float is-data"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#database"></use></svg>Datos locales</div>
        </div>
    </aside>
    <section class="auth-panel" aria-labelledby="auth-title">
        <div class="auth-panel-inner">
            <a class="auth-back" href="welcome.php"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#chevron-left"></use></svg>Volver a la portada</a>
            <p class="auth-eyebrow">Bienvenido de nuevo</p>
            <h1 id="auth-title">Inicia sesión</h1>
            <p class="auth-intro">Ingresa tus credenciales para administrar los lockers de manera segura.</p>
            <?php if ($error !== ''): ?><div class="auth-alert error" role="alert"><span aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#circle-alert"></use></svg></span><span><?= h($error) ?></span></div><?php endif; ?>
            <?php if ($success !== ''): ?><div class="auth-alert success" role="status"><span aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#check"></use></svg></span><span><?= h($success) ?></span></div><?php endif; ?>
            <form method="post" class="auth-form" autocomplete="on">
                <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
                <div class="auth-field" data-reveal><label for="username">Nombre de usuario</label><div class="input-wrap"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#user"></use></svg><input type="text" id="username" name="username" value="<?= h($username) ?>" placeholder="Ej. seguridad.hotel" maxlength="60" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus></div></div>
                <div class="auth-field" data-reveal><div class="field-head"><label for="password">Contraseña</label><span>Acceso privado</span></div><div class="input-wrap password-wrap"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#key-round"></use></svg><input type="password" id="password" name="password" placeholder="Introduce tu contraseña" autocomplete="current-password" maxlength="512" required><button class="toggle-password" type="button" data-toggle-password="password" aria-label="Mostrar contraseña" aria-pressed="false">Mostrar</button></div></div>
                <button class="auth-submit" type="submit">Entrar a Grand Sirenis Locker App <svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#arrow-right"></use></svg></button>
            </form>
            <div class="auth-switch" data-reveal>¿Aún no tienes acceso? <a href="register.php">Crear cuenta</a></div>
            <div class="auth-local-note" data-reveal><span class="auth-note-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#info"></use></svg></span><span>Aplicación local. Debes tener PHP y MySQL encendidos. Los usuarios adicionales los autoriza el administrador.</span></div>
        </div>
        <div class="auth-panel-footer" data-reveal><span>© <?= date('Y') ?> Grand Sirenis Locker App</span><span>Seguridad y organización, en un solo lugar.</span></div>
    </section>
</main>
</body>
</html>
