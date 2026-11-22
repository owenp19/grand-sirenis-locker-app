# Arquitectura — Grand Sirenis Locker App

## Visión general
Aplicación web ligera de tres capas sin frameworks: presentación, lógica de negocio y datos. Todo corre sobre PHP integrado (`php -S`) y MariaDB local.

## Capa de presentación (`public/`)
- Puntos de entrada: `index.php` (dashboard, requiere sesión), `login.php`, `register.php`, `logout.php`, `setup.php` (redirección a `register.php`), `api.php` (endpoint único de CRUD, auditoría y exportaciones).
- Estilos en cascada: `assets/css/theme.css` (tokens, `@font-face` de Roboto y base) → `assets/css/app.css` / `assets/css/auth.css` (layout por página) → `assets/css/components.css` (normalización de componentes, se carga al final).
- Recursos estáticos: `assets/fonts/` (Roboto variable WOFF2), `assets/icons/lucide-sprite.svg`, `assets/js/app.js`, `assets/js/auth.js`, `icons/`, `manifest.webmanifest`, `sw.js`, `offline.html`.
- Las vistas PHP contienen HTML con inserción mínima de datos ya preparados (helpers `h()` para escape).

## Capa de lógica de negocio
- `private/bootstrap.php`: inicialización (zona horaria, sesión segura, cabeceras), conexión PDO singleton (`db()`), helpers de autenticación (`current_user`, `require_login`), CSRF (`csrf_token`, `csrf_valid`), validación de campos (`field`, `valid_date`), respuestas JSON (`respond`, `fail`), escape HTML (`h`) y limitación de intentos de login (`login_throttle_*`, archivo local con `flock`).
- `public/api.php`: función `do_action()` que ejecuta las acciones `assign`, `release`, `transfer`, `status`, `edit`, `reconcile` dentro de transacciones con bloqueo `FOR UPDATE`; funciones de lectura `rows_lockers()`, `rows_movements()`, `get_lock()`; exportaciones CSV/JSON (`csv_output`).
- `public/login.php`, `public/register.php`, `public/logout.php`: autenticación con CSRF, `password_verify`/`password_hash`, rate limit por usuario+IP, rotación de ID/token y destrucción de sesión al salir.

## Capa de datos (`db/`)
- Base de datos: `sirenis_locker_db` (utf8mb4, InnoDB).
- Tablas: `users`, `lockers`, `movements`.
- Esquema detallado: ver `docs/DATABASE_SCHEMA.md`.
- Instalación nueva: `db/schema.sql` + `db/seed.sql` (una sola vez). Actualización: migraciones de `db/migrations/` en orden; `002_schema_hardening.sql` es idempotente.

## Flujo de petición
1. Navegador solicita una URL bajo `public/`.
2. El PHP correspondiente requiere `private/bootstrap.php`, que inicia sesión y valida acceso (`require_login`).
3. Para operaciones de mutación, el frontend llama a `api.php?resource=<accion>` con método POST, JSON en el cuerpo y token CSRF en header `X-CSRF-Token`.
4. `api.php` ejecuta la acción en una transacción, registra el movimiento y devuelve JSON (`{ok, message}` o `{ok:false, message}`).
5. El frontend renderiza la vista dinámicamente (sin recarga completa) usando `fetch`.

## PWA
- `manifest.webmanifest`: nombre `Grand Sirenis Locker App`, `short_name` `Sirenis Locker`, `display: standalone`, íconos 192/512, `lang: es-CO`, colores de marca (`background_color: #E7DFC9`, `theme_color: #A5832E`).
- `sw.js` (v3): caché estática de assets (tokens CSS, componentes, fuente Roboto, sprite Lucide, JS, íconos, manifest, offline.html); excluye `/api.php`, `/login.php`, `/register.php`, `/setup.php`, `/logout.php`; navegación con `no-store` y fallback a `offline.html`.

## Protección de archivos internos
- `php -S -t public` solo sirve `public/`; `private/` y `db/` no son accesibles por HTTP con este servidor.
- `.htaccess` deniega descarga de `.sql`, `.md`, `.ini`, `.env`, `.bak`, `.zip` (solo aplica con Apache).
- `private/runtime/` guarda el estado del rate limit (ignorado por Git, no servido por HTTP).

## Cabeceras de seguridad
- CSP con `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`; `style-src` permite estilos inline actuales.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Cache-Control: no-store`; HSTS solo sobre HTTPS.

## Pruebas
- Suite E2E en `tests/e2e/` con Playwright sobre Chrome/Edge del sistema.
- Ejecución aislada: `scripts/run-e2e.ps1` (base `hotel_lockers_test`, puerto 8001, limpieza garantizada).
- Validación estática: `scripts/run-tests.ps1` (`php -l`, `node --check`).
- Verificación visual Fase 5.1: `tests/manual/phase51-*.js` (fuente, sprite, consola, escritorio/móvil) con capturas en `tests/results/`.

## Design System
- Tokens en `theme.css`: marca y superficies, semánticos (`--color-*`), tipografía (`--text-*`, `--weight-*`), espaciado (`--space-*`), radios, sombras, transiciones, layout y foco.
- Componentes en `components.css`: `.btn`/`.btn-*`, formularios, `.panel`, tablas, `.pill`, `.modal`, alertas, `.empty`, `.skeleton-*`, `.tone-*`, `.icon`.
- Iconos: símbolo Lucide referenciado como `assets/icons/lucide-sprite.svg#<nombre>`; el sprite se regenera con `npm run icons:build`.

## Decisiones de diseño ya tomadas (ver `docs/DECISIONS.md`)
- No usar frameworks pesados.
- Mantener `php -S` como servidor de desarrollo; XAMPP solo para MySQL.
- Conservar estructura `public/` / `private/` / `db/`.
