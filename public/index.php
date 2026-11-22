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
<meta name="theme-color" content="#A5832E">
<meta name="description" content="Gestión local y segura de lockers de colaboradores del hotel.">
<meta name="csrf-token" content="<?= h(csrf_token()) ?>">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="assets/image/grand-sirenis-locker-app-favicon.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<link rel="preload" href="assets/fonts/roboto-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/theme.css">
<link rel="stylesheet" href="assets/css/app.css">
<link rel="stylesheet" href="assets/css/components.css">
<link rel="stylesheet" href="assets/css/motion.css">
<title>Panel de control · Grand Sirenis Locker App</title>
<script src="assets/js/app.js" defer></script>
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
    <span class="brand-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><rect x="6" y="3" width="20" height="26" rx="5" stroke="currentColor" stroke-width="2.4"/><path d="M11 9h10M11 13h10M20 18h1M11 23h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span>
    <span><strong>Grand Sirenis Locker App</strong><small>GESTIÓN HOTELERA</small></span>
  </a>
  <div class="nav-label">ESPACIO DE TRABAJO</div>
  <nav class="navigation" id="nav" aria-label="Módulos del sistema">
    <button type="button" class="nav-btn active" data-page="dashboard" aria-controls="view" aria-current="page"><span class="nav-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#layout-dashboard"></use></svg></span> Dashboard</button>
    <button type="button" class="nav-btn" data-page="lockers" aria-controls="view"><span class="nav-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#boxes"></use></svg></span> Inventario</button>
    <button type="button" class="nav-btn" data-page="people" aria-controls="view"><span class="nav-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#users"></use></svg></span> Colaboradores</button>
    <button type="button" class="nav-btn" data-page="history" aria-controls="view"><span class="nav-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#history"></use></svg></span> Movimientos</button>
    <button type="button" class="nav-btn" data-page="issues" aria-controls="view"><span class="nav-icon" aria-hidden="true"><svg class="icon"><use href="assets/icons/lucide-sprite.svg#triangle-alert"></use></svg></span> Incidencias <span class="nav-counter" id="issueBadge"></span></button>
  </nav>
  <div class="side-footer">
    <div class="status-line"><span class="status-dot"></span> MySQL local</div>
    <small>Modo local · Acceso protegido</small>
    <div class="user-card"><div class="avatar"><?= h(user_initial((string) $user['name'])) ?></div><div class="user-meta"><b><?= h($user['name']) ?></b><small><?= $isAdmin ? 'Administrador' : 'Operador' ?></small></div></div>
  </div>
</aside>
<div class="workspace">
<header class="topbar">
  <a class="topbar-brand" href="index.php" aria-label="Grand Sirenis Locker App, inicio">
    <span class="brand-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><rect x="6" y="3" width="20" height="26" rx="5" stroke="currentColor" stroke-width="2.4"/><path d="M11 9h10M11 13h10M20 18h1M11 23h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span>
    <span><strong>Grand Sirenis</strong><small>LOCKER APP</small></span>
  </a>
  <div class="topbar-context">
    <span class="topbar-kicker">Centro operativo</span>
    <span class="topbar-title" id="topbarTitle">Panel de control</span>
  </div>
  <div class="topbar-actions">
    <span class="topbar-role"><?= $isAdmin ? 'Administrador' : 'Operador' ?></span>
    <time class="topbar-date" datetime="<?= date('Y-m-d') ?>"><?= date('d/m/Y') ?></time>
    <?php if ($isAdmin): ?><a class="topbar-admin" href="register.php"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#user-plus"></use></svg><span>Crear usuario</span></a><?php endif; ?>
    <form method="post" action="logout.php"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><button type="submit" class="logout-btn" aria-label="Cerrar sesión"><svg class="icon" aria-hidden="true"><use href="assets/icons/lucide-sprite.svg#log-out"></use></svg><span>Salir</span></button></form>
  </div>
</header>
<main id="view" class="content" tabindex="-1" aria-busy="true">
  <div class="skeleton-page" aria-hidden="true">
    <div class="skeleton-block skeleton-hero"></div>
    <div class="skeleton-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>
    <div class="skeleton-block skeleton-panel"></div>
    <p class="skeleton-text">Cargando datos desde MySQL…</p>
  </div>
</main>
<p id="viewStatus" class="sr-only" role="status" aria-live="polite"></p>
<footer class="app-footer">Grand Sirenis Locker App · Sistema local de lockers <span>PHP + MySQL · PWA</span></footer>
</div>
</div>
<div id="modalRoot"></div><div id="toast" class="toast" role="status" aria-live="polite"></div><div id="connectionBar" role="status" class="connection-bar" hidden>Sin conexión con el servidor local. Las consultas y cambios requieren PHP y MySQL activos.</div>
</body></html>
