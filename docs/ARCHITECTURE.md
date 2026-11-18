# Arquitectura — Grand Sirenis Locker App

## Visión general
Aplicación web ligera de tres capas sin frameworks: presentación, lógica de negocio y datos. Todo corre sobre PHP integrado (`php -S`) y MariaDB local.

## Capa de presentación (`public/`)
- Puntos de entrada: `index.php` (dashboard, requiere sesión), `login.php`, `register.php`, `logout.php`, `setup.php` (redirección a `register.php`), `api.php` (endpoint único de CRUD, auditoría y exportaciones).
- Recursos estáticos: `assets/css/app.css`, `assets/css/auth.css`, `assets/js/app.js`, `assets/js/auth.js`, `icons/`, `manifest.webmanifest`, `sw.js`, `offline.html`.
- Las vistas PHP contienen HTML con inserción mínima de datos ya preparados (helpers `h()` para escape).

## Capa de lógica de negocio
- `private/bootstrap.php`: inicialización (zona horaria, sesión segura, constantes de seguridad), conexión PDO singleton (`db()`), helpers de autenticación (`current_user`, `require_login`), CSRF (`csrf_token`, `csrf_valid`), validación de campos (`field`, `valid_date`), respuestas JSON (`respond`, `fail`), escape HTML (`h`).
- `public/api.php`: función `do_action()` que ejecuta las acciones `assign`, `release`, `transfer`, `status`, `edit`, `reconcile` dentro de transacciones con bloqueo `FOR UPDATE`; funciones de lectura `rows_lockers()`, `rows_movements()`, `get_lock()`; exportaciones CSV/JSON (`csv_output`).
- `public/login.php`, `public/register.php`, `public/logout.php`: control de autenticación con validación CSRF, `password_verify`, `password_hash`, bloqueo de intentos, `session_regenerate_id(true)`.

## Capa de datos (`db/`)
- Base de datos: `hotel_lockers` (utf8mb4, InnoDB).
- Tablas: `users`, `lockers`, `movements`.
- Esquema detallado: ver `docs/DATABASE_SCHEMA.md`.
- Instalación nueva: `db/schema.sql` + `db/seed.sql` (una sola vez). Actualización: `db/migrations/001_roles_usuarios.sql` (una sola vez).

## Flujo de petición
1. Navegador solicita una URL bajo `public/`.
2. El PHP correspondiente requiere `private/bootstrap.php`, que inicia sesión y valida acceso (`require_login`).
3. Para operaciones de mutación, el frontend llama a `api.php?resource=<accion>` con método POST, JSON en el cuerpo y token CSRF en header `X-CSRF-Token`.
4. `api.php` ejecuta la acción en una transacción, registra el movimiento y devuelve JSON (`{ok, message}` o `{ok:false, message}`).
5. El frontend renderiza la vista dinámicamente (sin recarga completa) usando `fetch`.

## PWA
- `manifest.webmanifest`: nombre `LockerFlow | Gestión Hotelera`, `short_name` `LockerFlow`, `display: standalone`, íconos 192/512, `lang: es-CO`. (Pendiente: renombrar a "Grand Sirenis Locker App".)
- `sw.js` (v2): caché estática de assets (CSS, JS, íconos, manifest, offline.html); excluye `/api.php`, `/login.php`, `/register.php`, `/setup.php`, `/logout.php`; navegación con `no-store` y fallback a `offline.html`.

## Protección de archivos internos
- `php -S -t public` solo sirve `public/`; `private/` y `db/` no son accesibles por HTTP con este servidor.
- `.htaccess` deniega descarga de `.sql`, `.md`, `.ini`, `.env`, `.bak`, `.zip` (solo aplica con Apache).

## Decisiones de diseño ya tomadas (ver `docs/DECISIONS.md`)
- No usar frameworks pesados.
- Mantener `php -S` como servidor de desarrollo; XAMPP solo para MySQL.
- Conservar estructura `public/` / `private/` / `db/`.
