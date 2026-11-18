<?php
require_once dirname(__DIR__) . '/private/bootstrap.php';
$user = require_login();
?><!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#152b41">
<meta name="description" content="Gestión local y segura de lockers de colaboradores del hotel.">
<meta name="csrf-token" content="<?= h(csrf_token()) ?>">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/svg+xml" href="icons/icon.svg">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<link rel="stylesheet" href="assets/css/app.css">
<title>Lockers | Gestión del hotel</title>
<script src="assets/js/app.js" defer></script>
</head>
<body>
<div class="layout" id="app">
<aside class="sidebar" aria-label="Navegación principal">
  <a class="brand" href="index.php" aria-label="Lockers Hotel inicio"><span class="brand-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><rect x="6" y="3" width="20" height="26" rx="5" stroke="currentColor" stroke-width="2.4"/><path d="M11 9h10M11 13h10M20 18h1M11 23h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span><span><strong>LockerFlow</strong><small>GESTIÓN HOTELERA</small></span></a>
  <div class="nav-label">ESPACIO DE TRABAJO</div>
  <nav class="navigation" id="nav">
    <button type="button" class="nav-btn active" data-page="dashboard"><span class="nav-icon">◫</span> Dashboard</button>
    <button type="button" class="nav-btn" data-page="lockers"><span class="nav-icon">▦</span> Inventario</button>
    <button type="button" class="nav-btn" data-page="people"><span class="nav-icon">♙</span> Colaboradores</button>
    <button type="button" class="nav-btn" data-page="history"><span class="nav-icon">◷</span> Movimientos</button>
    <button type="button" class="nav-btn" data-page="issues"><span class="nav-icon">⚑</span> Incidencias <span class="nav-counter" id="issueBadge"></span></button>
  </nav>
  <?php if (($user['role'] ?? '') === 'administrador'): ?><a class="user-admin-link" href="register.php">＋ Crear usuario</a><?php endif; ?>
  <div class="side-footer"><div class="status-line"><span class="status-dot"></span> Base de datos MySQL</div><small>Modo local · Acceso protegido</small><div class="user-card"><div class="avatar"><?= h(user_initial((string) $user['name'])) ?></div><div class="user-meta"><b><?= h($user['name']) ?></b><small><?= ($user['role'] ?? '') === 'administrador' ? 'Administrador' : 'Operador' ?></small></div></div><form method="post" action="logout.php"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><button type="submit" class="logout-btn">Cerrar sesión ↗</button></form></div>
</aside>
<div class="workspace"><div class="mobile-top"><a class="brand mobile-brand" href="index.php"><span class="brand-icon">▤</span><span><strong>LockerFlow</strong><small>GESTIÓN HOTELERA</small></span></a><?php if (($user['role'] ?? '') === 'administrador'): ?><a href="register.php" class="mobile-admin-link" aria-label="Registrar usuario">＋ Usuario</a><?php endif; ?><form method="post" action="logout.php"><input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>"><button type="submit" class="logout-btn" aria-label="Cerrar sesión">Salir ↗</button></form></div><main id="view" class="content" aria-live="polite"><div class="skeleton"><div class="shimmer"></div><p>Cargando datos desde MySQL…</p></div></main><footer class="app-footer">LockerFlow · Sistema local de lockers <span>PHP + MySQL · PWA</span></footer></div>
</div>
<div id="modalRoot"></div><div id="toast" class="toast" role="status" aria-live="polite"></div><div id="connectionBar" role="status" class="connection-bar" hidden>Sin conexión con el servidor local. Las consultas y cambios requieren PHP y MySQL activos.</div>
</body></html>
