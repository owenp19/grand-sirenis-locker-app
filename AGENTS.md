# AGENTS.md — Grand Sirenis Locker App

Instrucciones permanentes para Codex. Mantener este documento breve; las instrucciones especializadas viven en `.agents/skills/*/SKILL.md`.

## 1. Nombre y objetivo del proyecto
**Grand Sirenis Locker App**. Aplicación local, ligera y segura para gestionar lockers de colaboradores de un hotel: dashboard, inventario (156 lockers), asignación, liberación, traslado, colaboradores, movimientos, incidencias y exportación CSV/JSON. Con autenticación por roles (administrador / operador) y PWA instalable. Sin frameworks pesados (no Laravel, React, Angular, Vue ni Electron).

## 2. Tecnologías utilizadas
- Windows 10 (x64), PHP 8.2.12 (CLI, extensiones `pdo`, `pdo_mysql`, `session`), MariaDB 10.4.32 (XAMPP, `C:\xampp`), Node.js v26.13.0 / npm 11.19.1, Git 2.54.0.
- HTML5, CSS3, JavaScript vanilla (sin CDN ni dependencias externas), PWA (manifest + service worker), Playwright para pruebas E2E.
- Design System global: Roboto variable autoalojada (WOFF2) y Lucide Icons (ISC) empaquetados como sprite SVG local.

## 3. Arquitectura vigente
- `public/` expuesto al servidor: `index.php` (dashboard), `login.php`, `register.php`, `logout.php`, `setup.php` (redirige), `api.php` (CRUD, auditoría, exportaciones), `sw.js`, `manifest.webmanifest`, `offline.html`, `icons/`, `assets/`.
- Recursos de imagen: `public/assets/image/` (logos, favicon, icono Windows renombrados con la identidad de Grand Sirenis Locker App).
- Estilos en cascada: `assets/css/theme.css` (tokens + `@font-face`) → `assets/css/app.css` / `auth.css` (layout por página) → `assets/css/components.css` (componentes globales, se carga al final).
- Recursos visuales: `assets/fonts/roboto-*.woff2`, `assets/icons/lucide-sprite.svg` (generado por `scripts/build-icons.js` con `npm run icons:build`).
- `private/` interno (no servido por `php -S -t public`): `config.php` (conexión MySQL), `bootstrap.php` (PDO singleton, sesiones, CSRF, helpers de seguridad, cabeceras).
- `db/`: `schema.sql`, `seed.sql`, `migrations/001_roles_usuarios.sql`.
- Servidor: `php -S 127.0.0.1:8000 -t public`; MySQL por separado (XAMPP).
- Directorio del proyecto: `C:\Users\Owen\Documents\Sueños\software-apps\Grand-Sirenis-Locker-app` (corregido de `Grand-Sirenis-Loker-app`).
- Base de datos: `sirenis_locker_db`, tablas `users`, `lockers`, `movements` (InnoDB, utf8mb4).

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
- Antes de cualquier actualización, exportar respaldo SQL desde phpMyAdmin (`sirenis_locker_db → Exportar → SQL`).

## 11. Activación inteligente de skills y optimización de contexto
- Activar automáticamente los skills necesarios según la tarea (matriz en `.agents/skills/token-context-optimizer/SKILL.md`); no cargar skills irrelevantes.
- Mantener siempre las reglas esenciales de seguridad, calidad y memoria (secciones 5, 6 y 9), aunque no se carguen skills adicionales.
- Aplicar ahorro de tokens y carga progresiva de contexto en todas las sesiones: leer primero `AGENTS.md` y `docs/SESSION_STATE.md`, luego solo los archivos relevantes.
- Leer únicamente archivos relevantes; evitar lecturas masivas o repetidas del mismo archivo.
- Evitar herramientas, lecturas y operaciones repetidas; reutilizar resultados ya obtenidos en la sesión.
- No reinstalar componentes existentes (skills, dependencias, esquema, base de datos) sin verificar antes su estado.
- No generar código innecesario ni duplicar funciones, estilos o endpoints.

## 12. Entorno autorizado y datos
- Distinguir siempre datos reales de datos de demostración (`db/seed.sql` es el baseline original/demo).
- No modificar credenciales de producción sin autorización.
- Antes de migrar una base existente, crear respaldo (`scripts/backup-database.ps1`).
- El usuario de aplicación de MySQL debe tener privilegios mínimos (SELECT/INSERT/UPDATE/DELETE sobre `sirenis_locker_db`); nunca usar `root` en la aplicación.
- Los secretos viven en `.env` (no versionado) o variables de entorno; `.env.example` solo contiene placeholders.

## 13. Política global de recursos visuales
- Solo se incorporan recursos **originales, CC0 o con licencia que permita expresamente uso comercial**; se prefieren licencias sin atribución obligatoria.
- Prohibido usar imágenes premium, con marca de agua, capturadas de terceros o de licencia desconocida. Ante la duda, no se incorpora el recurso.
- Verificar la licencia **antes** de descargar; registrar procedencia, autor, versión, licencia y fecha de verificación en `docs/ASSET_LICENSES.md`.
- Alojar los recursos localmente: sin CDN ni peticiones externas en tiempo de ejecución.
- Optimizar el formato: SVG para iconos, WOFF2 para tipografía, WebP/AVIF para fotografía; evitar modelos 3D pesados o innecesarios.
- Iconos: Lucide mediante el sprite local. Añadir el nombre a `scripts/build-icons.js` y regenerar con `npm run icons:build`; no cargar iconos que no se usen.
- Tipografía: Roboto variable local en `public/assets/fonts/` con `font-display: swap`; no añadir importaciones de Google Fonts ni duplicar `@font-face`.
- Usar los tokens y clases de `theme.css`/`components.css`; evitar `style="..."` en HTML generado.
- Si la licencia exige atribución, incluir el aviso en `docs/ASSET_LICENSES.md` y en la documentación visible que corresponda.
