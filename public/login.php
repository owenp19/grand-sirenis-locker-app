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
        $attempts = (int) ($_SESSION['login_attempts'] ?? 0);
        $start = (int) ($_SESSION['first_attempt'] ?? time());
        if (time() - $start >= 900) { $attempts = 0; $start = time(); }
        if ($attempts >= 8) {
            $error = 'Se alcanzó el límite de intentos de esta sesión. Inténtalo en unos minutos.';
        } elseif ($username === '' || $password === '' || strlen($username) > 60 || strlen($password) > 512) {
            $error = 'Introduce un usuario y una contraseña válidos.';
        } else {
            try {
                $q = db()->prepare('SELECT id, username, display_name, password_hash, role FROM users WHERE username = ? LIMIT 1');
                $q->execute([$username]);
                $account = $q->fetch();
                if ($account && password_verify($password, (string) $account['password_hash'])) {
                    session_regenerate_id(true);
                    $_SESSION['user'] = [
                        'id' => (int) $account['id'],
                        'username' => (string) $account['username'],
                        'name' => (string) $account['display_name'],
                        'role' => (string) $account['role'],
                    ];
                    $_SESSION['last_seen'] = time();
                    unset($_SESSION['login_attempts'], $_SESSION['first_attempt']);
                    db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([(int) $account['id']]);
                    header('Location: index.php'); exit;
                }
                $_SESSION['login_attempts'] = $attempts + 1;
                $_SESSION['first_attempt'] = $start;
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
    <meta name="theme-color" content="#152b41">
    <meta name="description" content="Acceso privado al sistema local de gestión de lockers del hotel.">
    <link rel="icon" href="icons/icon.svg" type="image/svg+xml">
    <link rel="manifest" href="manifest.webmanifest">
    <link rel="stylesheet" href="assets/css/app.css">
    <link rel="stylesheet" href="assets/css/auth.css">
    <script src="assets/js/auth.js" defer></script>
    <title>Iniciar sesión · LockerFlow</title>
</head>
<body class="auth-page auth-v2">
<main class="auth-shell">
    <aside class="auth-showcase" aria-label="Sobre LockerFlow">
        <a class="auth-logo" href="login.php"><span class="auth-logo-icon"><img src="icons/icon.svg" alt=""></span><span><strong>LockerFlow</strong><small>GESTIÓN HOTELERA</small></span></a>
        <div class="showcase-content">
            <span class="auth-tag"><span class="live-dot"></span> GESTIÓN LOCAL E INTELIGENTE</span>
            <h1>Cada locker<br>en <em>su lugar.</em></h1>
            <p>Controla las asignaciones, consulta la disponibilidad y lleva un registro claro de cada movimiento.</p>
            <div class="showcase-art" aria-hidden="true">
                <div class="locker-sample">
                    <div class="sample-head"><span>LockerFlow / Inventario</span><span class="sample-hd-dot"></span></div>
                    <div class="locker-tiles"><span class="tile occupied"></span><span class="tile occupied"></span><span class="tile free"></span><span class="tile occupied"></span><span class="tile free"></span><span class="tile attention"></span><span class="tile free"></span><span class="tile occupied"></span><span class="tile free"></span></div>
                    <div class="sample-foot"><span><i class="legend-mini green"></i> Disponibles</span><span><i class="legend-mini dark"></i> Asignados</span></div>
                </div>
                <div class="sample-badge"><span class="badge-icon">✓</span><span><strong>Control total</strong><small>Datos guardados en MySQL</small></span></div>
            </div>
        </div>
        <div class="showcase-bottom"><span>◈ Sistema privado para el hotel</span><span>PHP · MySQL · PWA</span></div>
    </aside>
    <section class="auth-panel" aria-labelledby="auth-title">
        <div class="auth-panel-inner">
            <div class="auth-mobile-logo"><img src="icons/icon.svg" alt=""><strong>LockerFlow</strong></div>
            <span class="form-overline">BIENVENIDO DE NUEVO</span>
            <h2 id="auth-title">Inicia sesión <span class="hi-mark">↗</span></h2>
            <p class="form-intro">Ingresa tus credenciales para administrar los lockers de manera segura.</p>
            <?php if ($error !== ''): ?><div class="auth-alert error" role="alert"><span aria-hidden="true">!</span><span><?= h($error) ?></span></div><?php endif; ?>
            <?php if ($success !== ''): ?><div class="auth-alert success" role="status"><span aria-hidden="true">✓</span><span><?= h($success) ?></span></div><?php endif; ?>
            <form method="post" class="auth-form" autocomplete="on">
                <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
                <div class="auth-field"><label for="username">Nombre de usuario</label><div class="input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.3-3.5 2.5-5.2 6.5-5.2s6.2 1.7 6.5 5.2"/></svg><input type="text" id="username" name="username" value="<?= h($username) ?>" placeholder="Ej. seguridad.hotel" maxlength="60" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus></div></div>
                <div class="auth-field"><div class="field-head"><label for="password">Contraseña</label><span>Acceso privado</span></div><div class="input-wrap password-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input type="password" id="password" name="password" placeholder="Introduce tu contraseña" autocomplete="current-password" maxlength="512" required><button class="toggle-password" type="button" data-toggle-password="password" aria-label="Mostrar contraseña" aria-pressed="false">Mostrar</button></div></div>
                <button class="auth-submit" type="submit">Entrar a LockerFlow <span aria-hidden="true">→</span></button>
            </form>
            <div class="auth-switch">¿Aún no tienes acceso? <a href="register.php">Crear cuenta</a></div>
            <div class="auth-local-note"><span class="auth-note-icon">⌁</span><span>Aplicación local. Debes tener PHP y MySQL encendidos. Los usuarios adicionales los autoriza el administrador.</span></div>
        </div>
        <div class="auth-panel-footer"><span>© <?= date('Y') ?> LockerFlow</span><span>Seguridad y organización, en un solo lugar.</span></div>
    </section>
</main>
</body>
</html>
