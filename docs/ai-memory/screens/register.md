# register.md — Memoria de pantalla

## 1. Objetivo
Pantalla de registro de usuarios. Permite crear el primer administrador (instalación nueva) o registrar nuevos usuarios (solo administradores con sesión).

## 2. Archivos principales
- `public/register.php` — PHP + HTML de la pantalla
- `public/assets/css/auth.css` — Estilos exclusivos de auth
- `public/assets/css/theme.css` — Tokens globales
- `public/assets/css/components.css` — Componentes globales (carga final)
- `public/assets/css/motion.css` — Animaciones
- `public/assets/js/auth.js` — JS del formulario
- `public/assets/js/motion.js` — JS de movimiento
- `private/bootstrap.php` — Helpers de seguridad, sesiones, CSRF

## 3. Componentes
- `.auth-v2` (contenedor principal)
- `.auth-shell.register-layout` (variante registro)
- `.auth-showcase` (columna presentación con roles)
- `.auth-panel` (tarjeta del formulario)
- `.auth-form` (formulario)
- `.auth-field` (grupo de campo)
- `.input-wrap` (wrapper de input con icono)
- `.auth-submit` (botón principal)
- `.auth-alert` (error/success)
- `.auth-switch` (enlace a login)
- `.auth-local-note` (nota informativa)
- `.auth-restricted` (estado de acceso denegado)
- `.role-notice` (aviso de rol)
- `.boot` (precarga)

## 4. Dependencias
- theme.css (tokens, tipografía Roboto, iconos .icon)
- auth.css (estilos auth-v2, register-layout)
- components.css (.btn, .form-item, .notice)
- motion.css (animaciones a-rise, boot)
- lucide-sprite.svg (iconos: chevron-left, circle-alert, check, user, at-sign, shield-check, key-round, arrow-right, info, lock)

## 5. Estado actual
- Funcional, con validación CSRF, roles (administrador/operador), contraseña 12-128 chars
- Primera cuenta solo desde localhost, rol administrador forzado
- Redirige a index.php tras crear cuenta inicial

## 6. Decisiones visuales
- Misma paleta arena + oro que login
- Variante `.register-layout` con panel más compacto
- Selector de rol solo visible si no es cuenta inicial
- Avisos de restricción cuando no hay permisos

## 7. Cambios realizados
- (Ninguno aún)

## 8. Problemas conocidos
- (Ninguno documentado)

## 9. Pendientes
- (Ninguno)
