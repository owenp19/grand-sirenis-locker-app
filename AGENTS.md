# AGENTS.md — Grand Sirenis Locker App

Instrucciones permanentes para Codex. Mantener este documento breve; las instrucciones especializadas viven en `.agents/skills/*/SKILL.md`.

## 1. Nombre y objetivo del proyecto
**Grand Sirenis Locker App** (el README lo denomina "LockerFlow"). Aplicación local, ligera y segura para gestionar lockers de colaboradores de un hotel: dashboard, inventario (156 lockers), asignación, liberación, traslado, colaboradores, movimientos, incidencias y exportación CSV/JSON. Con autenticación por roles (administrador / operador) y PWA instalable. Sin frameworks pesados (no Laravel, React, Angular, Vue ni Electron).

## 2. Tecnologías utilizadas
- Windows 10 (x64), PHP 8.2.12 (CLI, extensiones `pdo`, `pdo_mysql`, `session`), MariaDB 10.4.32 (XAMPP, `C:\xampp`), Node.js v26.13.0 / npm 11.19.1, Git 2.54.0.
- HTML5, CSS3, JavaScript vanilla (sin CDN ni dependencias externas), PWA (manifest + service worker), Playwright para pruebas E2E.

## 3. Arquitectura vigente
- `public/` expuesto al servidor: `index.php` (dashboard), `login.php`, `register.php`, `logout.php`, `setup.php` (redirige), `api.php` (CRUD, auditoría, exportaciones), `sw.js`, `manifest.webmanifest`, `offline.html`, `icons/`, `assets/`.
- `private/` interno (no servido por `php -S -t public`): `config.php` (conexión MySQL), `bootstrap.php` (PDO singleton, sesiones, CSRF, helpers de seguridad, cabeceras).
- `db/`: `schema.sql`, `seed.sql`, `migrations/001_roles_usuarios.sql`.
- Servidor: `php -S 127.0.0.1:8000 -t public`; MySQL por separado (XAMPP).
- Base de datos: `hotel_lockers`, tablas `users`, `lockers`, `movements` (InnoDB, utf8mb4).

## 4. Convenciones de código
- PHP: `declare(strict_types=1)`, consultas preparadas PDO (`EMULATE_PREPARES => false`), `password_hash`/`password_verify`, helpers de `bootstrap.php` (`h()`, `csrf_token()`, `field()`, `valid_date()`, `respond()`, `fail()`).
- Frontend: HTML5 semántico, variables CSS, CSS Grid/Flexbox, JS ES6+ (`fetch`, `async/await`), sin librerías externas.
- No mezclar innecesariamente HTML, SQL y lógica de negocio. No crear controladores ni servicios vacíos.
- Mensajes de UI en español; nombres de código consistentes con el existente.

## 5. Reglas de seguridad
- Las claves, contraseñas y secretos nunca van en el frontend ni en Git. Usar variables de entorno o equivalente; no commitear `private/config.php` con valores reales.
- No exponer mensajes de error internos al usuario (`error_log` + respuestas genéricas).
- Cabeceras de seguridad ya aplicadas (CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Cache-Control: no-store`).
- CSRF en formularios y header `X-CSRF-Token` para API; sesiones `HttpOnly`/`SameSite=Lax`/`secure` con regeneración de ID.
- No exponer PHP ni MySQL a internet; `php -S` solo en `127.0.0.1`.

## 6. Reglas de calidad
- DRY, KISS, YAGNI. No generar CSS ni JavaScript duplicado; no crear múltiples funciones que hagan lo mismo.
- Antes de crear cualquier componente, función o servicio, verificar si ya existe algo reutilizable.
- No generar archivos vacíos ni estructuras artificialmente complejas.
- Ejecutar `php -l` sobre los PHP modificados. Cambios pequeños y verificables; no refactorizaciones masivas sin entender el impacto.

## 7. Procedimientos de testing
- Playwright sobre Chromium en `http://127.0.0.1:8000`, entorno local con datos sintéticos.
- No ejecutar pruebas destructivas sobre datos reales ni en producción.
- Toda modificación visual significativa (UI/UX) debe revisarse con Playwright.
- Registrar resultados: pruebas exitosas, fallidas, pendientes y bloqueadas.

## 8. Ubicación de los skills
- `.agents/skills/` con 9 skills: `ui-ux-desktop`, `frontend-engineering`, `php-backend`, `mysql-database`, `cybersecurity`, `playwright-testing`, `clean-code-performance`, `windows-automation`, `project-memory`. Cada uno con su `SKILL.md`.

## 9. Memoria persistente
Al iniciar sesión: leer `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/SESSION_STATE.md`, `docs/DECISIONS.md`, `docs/BACKLOG.md`; comprobar que la documentación coincida con el código; continuar desde el estado real.
Al finalizar tarea: documentar cambios, registrar archivos modificados, actualizar tareas terminadas, registrar problemas pendientes, documentar pruebas ejecutadas, actualizar siguiente paso recomendado.
Documentos: `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/SESSION_STATE.md`, `docs/DECISIONS.md`, `docs/BACKLOG.md`, `docs/CHANGELOG.md`, `docs/DATABASE_SCHEMA.md`, `docs/DIAGNOSTICO.md`.
No almacenar contraseñas, tokens ni datos sensibles en estos documentos. El código fuente es la referencia definitiva.

## 10. Restricciones sobre operaciones destructivas
- No borrar archivos ni modificar bases de datos reales sin respaldo y autorización.
- No ejecutar operaciones irreversibles (`DROP`, `DELETE` sin `WHERE`, `TRUNCATE`) sin aprobación expresa.
- `db/seed.sql` solo en instalación nueva; `db/migrations/001_roles_usuarios.sql` solo una vez sobre base existente.
- Antes de cualquier actualización, exportar respaldo SQL desde phpMyAdmin (`hotel_lockers → Exportar → SQL`).
