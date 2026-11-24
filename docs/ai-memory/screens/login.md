# login.md — Memoria de pantalla

## 1. Objetivo
Pantalla de inicio de sesión. Permite al usuario autenticarse con usuario y contraseña. Redirige al dashboard si ya hay sesión activa.

## 2. Archivos principales
- `public/login.php` — PHP + HTML de la pantalla
- `public/assets/css/auth.css` — Estilos exclusivos de auth
- `public/assets/css/theme.css` — Tokens globales
- `public/assets/css/components.css` — Componentes globales (carga final)
- `public/assets/css/motion.css` — Animaciones
- `public/assets/js/auth.js` — JS del formulario
- `public/assets/js/motion.js` — JS de movimiento
- `private/bootstrap.php` — Helpers de seguridad, sesiones, CSRF

## 3. Componentes
- `.auth-v2` (contenedor principal)
- `.auth-shell` (grid de 2 columnas)
- `.auth-showcase` (columna presentación)
- `.auth-panel` (tarjeta del formulario)
- `.auth-form` (formulario)
- `.auth-field` (grupo de campo)
- `.input-wrap` (wrapper de input con icono)
- `.auth-submit` (botón principal)
- `.auth-alert` (error/success)
- `.auth-switch` (enlace a registro)
- `.auth-local-note` (nota informativa)
- `.boot` (precarga)

## 4. Dependencias
- theme.css (tokens, tipografía Roboto, iconos .icon)
- auth.css (estilos auth-v2)
- components.css (.btn, .form-item, .notice, .skip-link)
- motion.css (animaciones a-rise, boot)
- lucide-sprite.svg (iconos: chevron-left, circle-alert, check, user, key-round, arrow-right, info, lock)

## 5. Estado actual
- Funcional, con validación CSRF, throttling de intentos, password_verify
- Redirige a index.php si `current_user()` existe
- GET param `created` muestra mensaje de éxito

## 6. Decisiones visuales
- Paleta arena + oro: `--a-ink` #2B2620, `--a-gold` var(--brand-gold) #A5832E
- Fondo degradado radial + lineal arena/oro
- Tarjeta blanca flotante con sombra profunda
- Botón principal oro profundo #8F6F28
- Inputs con icono a la izquierda, toggle password a la derecha

## 7. Cambios realizados
- (Ninguno aún)

## 8. Problemas conocidos
- (Ninguno documentado)

## 9. Pendientes
- (Ninguno)
