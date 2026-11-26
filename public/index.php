<?php
require_once dirname(__DIR__) . '/private/bootstrap.php';
// Sin sesión, la primera pantalla es la portada; con sesión, se accede al dashboard.
$user = current_user();
if ($user === null) { header('Location: welcome.php'); exit; }
$isAdmin = is_admin();
?><!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#14283c">
<meta name="description" content="Centro operativo para la gestión de lockers de colaboradores del hotel.">
<meta name="csrf-token" content="<?= h(csrf_token()) ?>">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="assets/image/grand-sirenis-locker-app-favicon.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<link rel="preload" href="assets/fonts/roboto-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/image/grand-sirenis-locker-app-logo-white-480.png" as="image" type="image/png">
<link rel="stylesheet" href="assets/css/theme.css">
<link rel="stylesheet" href="assets/css/app.css">
<link rel="stylesheet" href="assets/css/components.css">
<link rel="stylesheet" href="assets/css/motion.css">
<link rel="stylesheet" href="assets/css/settings.css">
<link rel="stylesheet" href="assets/css/offboarding.css">
<link rel="stylesheet" href="assets/css/management.css">
<title>Panel de control · Grand Sirenis Locker App</title>
<script src="assets/js/app.js" defer></script>
<script src="assets/js/settings.js" defer></script>
<script src="assets/js/profile.js" defer></script>
<script src="assets/js/motion.js" defer></script>
</head>
<body class="dashboard-page">
<a class="skip-link" href="#view">Saltar al contenido</a>
<div class="boot" aria-hidden="true">
    <div class="boot-inner">
        <img class="boot-logo" src="assets/image/grand-sirenis-locker-app-logo-black-720.png" alt="" width="720" height="240" decoding="async">
        <span class="boot-bar"></span>
        <span class="boot-label">Preparando la aplicación</span>
    </div>
</div>
<div class="layout" id="app">
<aside class="sidebar" aria-label="Navegación principal">
  <a class="brand" href="index.php" aria-label="Grand Sirenis Locker App, inicio">
    <img class="brand-logo" src="assets/image/grand-sirenis-locker-app-logo-white-480.png" alt="" width="480" height="160" decoding="async">
    <span class="brand-tagline">Gestión hotelera</span>
  </a>
  <div class="nav-label" id="navLabel">Espacio de trabajo</div>
  <nav class="navigation" id="nav" aria-labelledby="navLabel">
    <button type="button" class="nav-btn active" data-page="dashboard" aria-controls="view" aria-current="page"><span class="nav-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#layout-dashboard"></use></svg></span><span class="nav-text">Dashboard</span></button>
    <button type="button" class="nav-btn" data-page="lockers" aria-controls="view"><span class="nav-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#database"></use></svg></span><span class="nav-text">Gestión de lockers</span></button>
    <button type="button" class="nav-btn" data-page="history" aria-controls="view"><span class="nav-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#history"></use></svg></span><span class="nav-text">Movimientos</span></button>
    <button type="button" class="nav-btn" data-page="issues" aria-controls="view"><span class="nav-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#triangle-alert"></use></svg></span><span class="nav-text">Incidencias</span><span class="nav-counter" id="issueBadge"></span></button>
    <button type="button" class="nav-btn" data-page="settings" aria-controls="view"><span class="nav-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#wrench"></use></svg></span><span class="nav-text">Configuración</span></button>
    <?php if ($isAdmin): ?>
    <button type="button" class="nav-btn" data-page="offboarding" aria-controls="view"><span class="nav-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#user"></use></svg></span><span class="nav-text">Salida de personal</span></button>
    <?php endif; ?>
  </nav>
  <div class="side-footer">
    <div class="status-card">
      <div class="status-line" id="serverStatusLine"><span class="status-dot" id="serverStatusDot" aria-hidden="true"></span><span id="serverStatusText">Comprobando servidor…</span></div>
    </div>
    <form id="logoutForm" method="post" action="logout.php"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><button type="button" class="side-logout" data-action="logout" aria-label="Cerrar sesión"><span class="icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#log-out"></use></svg></span><span>Cerrar sesión</span></button></form>
  </div>
</aside>
<div class="workspace">
<header class="topbar">
  <a class="topbar-brand" href="index.php" aria-label="Grand Sirenis Locker App, inicio">
    <img src="assets/image/grand-sirenis-locker-app-logo-black-720.png" alt="" width="720" height="240" decoding="async">
  </a>
  <div class="topbar-context">
    <span class="topbar-kicker">Centro operativo</span>
    <span class="topbar-title" id="topbarTitle">Panel de control</span>
  </div>
  <div class="topbar-actions">
    <button type="button" class="topbar-notify" id="notifBtn" data-action="viewIssues" aria-label="Incidencias de datos">
      <svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#bell"></use></svg>
      <span class="topbar-badge" id="notifBadge" hidden></span>
    </button>
    <span class="topbar-sep" aria-hidden="true"></span>
    <time class="topbar-date" datetime="<?= date('Y-m-d') ?>"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#calendar-days"></use></svg><span><?= date('d/m/Y') ?></span></time>
    <div class="topbar-user">
      <span class="avatar avatar-sm" id="topbarUserInitial" aria-hidden="true"><?= h(user_initial((string) $user['name'])) ?></span>
      <span class="topbar-user-meta"><b id="topbarUserName"><?= h($user['name']) ?></b><small><?= $isAdmin ? 'Administrador' : 'Operador' ?></small></span>
    </div>
    <?php if ($isAdmin): ?><a class="topbar-admin" href="register.php"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#user-plus"></use></svg><span>Crear usuario</span></a><?php endif; ?>
  </div>
</header>
<main id="view" class="content" tabindex="-1" aria-busy="true">
  <div class="skeleton-page" aria-hidden="true">
    <div class="skeleton-block skeleton-hero"></div>
    <div class="skeleton-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>
    <div class="skeleton-split"><div class="skeleton-block skeleton-panel"></div><div class="skeleton-block skeleton-panel"></div></div>
    <p class="skeleton-text">Cargando datos desde MySQL…</p>
  </div>
</main>
<p id="viewStatus" class="sr-only" role="status" aria-live="polite"></p>
<footer class="app-footer"><span>Grand Sirenis Locker App · Sistema local de lockers</span><span>PHP + MySQL · PWA</span></footer>
</div>
</div>
<div id="modalRoot"></div><div id="toast" class="toast" role="status" aria-live="polite"></div><div id="connectionBar" role="status" class="connection-bar" hidden>Sin conexión con el servidor local. Las consultas y cambios requieren PHP y MySQL activos.</div>
</body></html>
