<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/private/bootstrap.php';

// Con sesión activa se entra directo al dashboard; sin sesión se muestra esta portada.
if (current_user()) { header('Location: index.php'); exit; }

$doorStates = ['used', 'used', 'free', 'used', 'warn', 'free', 'used', 'free'];
?><!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#A5832E">
    <meta name="description" content="Grand Sirenis Locker App: gestión inteligente, segura y eficiente de los lockers del hotel.">
    <link rel="icon" type="image/png" href="assets/image/grand-sirenis-locker-app-favicon.png">
    <link rel="manifest" href="manifest.webmanifest">
    <link rel="preload" href="assets/fonts/roboto-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="assets/image/grand-sirenis-locker-app-logo-black-720.png" as="image">
    <link rel="stylesheet" href="assets/css/theme.css">
    <link rel="stylesheet" href="assets/css/welcome.css">
    <link rel="stylesheet" href="assets/css/components.css">
    <link rel="stylesheet" href="assets/css/motion.css">
    <script src="assets/js/motion.js" defer></script>
    <title>Bienvenido · Grand Sirenis Locker App</title>
</head>
<body class="welcome-page">
<div class="boot" aria-busy="true" aria-label="Cargando Grand Sirenis Locker App">
    <div class="boot-inner">
        <img class="boot-logo" src="assets/image/grand-sirenis-locker-app-logo-black-720.png" alt="Grand Sirenis Locker App" width="380" height="128" decoding="async">
        <span class="boot-progress"></span>
        <p class="boot-label">Cargando Grand Sirenis Locker App</p>
    </div>
</div>
<a class="welcome-skip" href="#welcome-main">Saltar al contenido</a>
<div class="welcome-stage">
    <main id="welcome-main" class="welcome-main">
        <section class="welcome-copy" aria-labelledby="welcome-title">
            <img class="welcome-logo" src="assets/image/grand-sirenis-locker-app-logo-black-720.png"
                 alt="Grand Sirenis Locker App" width="720" height="240" decoding="async" fetchpriority="high">
            <p class="welcome-eyebrow">Gestión hotelera · Uso interno</p>
            <h1 id="welcome-title" class="welcome-title">
                <span class="welcome-title-kicker">Bienvenido a</span>
                <span class="welcome-title-brand">Grand Sirenis Locker App</span>
            </h1>
            <p class="welcome-lead">Gestión inteligente, segura y eficiente de lockers.</p>
            <div class="welcome-actions">
                <a class="welcome-cta" href="login.php">
                    <span>Iniciar sesión</span>
                    <svg class="icon" aria-hidden="true" focusable="false"><use href="assets/icons/lucide-sprite.svg#arrow-right"></use></svg>
                </a>
                <p class="welcome-access-note">
                    <svg class="icon icon-sm" aria-hidden="true" focusable="false"><use href="assets/icons/lucide-sprite.svg#lock"></use></svg>
                    Acceso exclusivo para personal autorizado.
                </p>
            </div>
            <ul class="welcome-features">
                <li data-reveal><span class="feature-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#shield-check"></use></svg></span>Control por roles</li>
                <li data-reveal><span class="feature-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#layout-dashboard"></use></svg></span>Inventario siempre al día</li>
                <li data-reveal><span class="feature-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#history"></use></svg></span>Trazabilidad de movimientos</li>
            </ul>
        </section>
        <aside class="welcome-visual" aria-hidden="true">
            <div class="welcome-plate">
                <div class="plate-head">
                    <span class="plate-title">Inventario de lockers</span>
                    <span class="plate-chip">13 bloques</span>
                </div>
                <div class="locker-grid">
                    <?php for ($i = 0; $i < 32; $i++): $row = intdiv($i, 8); $state = $doorStates[($i + $row) % 8]; ?>
                    <span class="locker-door is-<?= $state ?>"></span>
                    <?php endfor; ?>
                </div>
                <div class="plate-foot">
                    <span><i class="dot dot-free"></i>Disponible</span>
                    <span><i class="dot dot-used"></i>Asignado</span>
                    <span><i class="dot dot-warn"></i>Atención</span>
                </div>
            </div>
            <div class="welcome-float welcome-float--secure">
                <span class="float-icon"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#shield-check"></use></svg></span>
                <span class="float-text"><strong>Acceso protegido</strong><small>Sesión y roles</small></span>
            </div>
            <div class="welcome-float welcome-float--data">
                <span class="float-icon"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#database"></use></svg></span>
                <span class="float-text"><strong>Datos locales</strong><small>MySQL · sin nube</small></span>
            </div>
        </aside>
    </main>
    <footer class="welcome-footer">
        <span>© <?= date('Y') ?> Grand Sirenis Locker App</span>
        <span class="welcome-footer-made">
            Hecho con
            <svg class="icon welcome-heart" aria-hidden="true" focusable="false"><use href="assets/icons/lucide-sprite.svg#heart"></use></svg>
            <span class="sr-only">amor</span>
            por Owen Pusey.
        </span>
    </footer>
</div>
</body>
</html>
