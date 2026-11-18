# Changelog — Grand Sirenis Locker App

## 2026-11-17 — Fases 3 y 4 (integración y verificación integral)
- **Sesión y cabeceras:** `session.use_only_cookies`, `use_trans_sid=0`, `gc_maxlifetime=14400`; `Permissions-Policy`; HSTS cuando hay HTTPS.
- **Rate limit de login del lado servidor:** contador por usuario+IP y por IP en `private/runtime/login-throttle.json` (SHA-256 + `flock`), 8/15 min y 40/15 min; limpiar cookies no lo reinicia.
- **Anti-enumeración:** `login.php` verifica siempre un hash real o ficticio.
- **CSRF:** token rotado tras login y registro inicial; logout con POST + token y destrucción completa de sesión/cookie.
- **Integración verificada:** dashboard, inventario, colaboradores, asignaciones, liberaciones, traslados, estados, movimientos e incidencias contra MariaDB.
- **Playwright desbloqueado:** Chrome/Edge del sistema vía `launchOptions.executablePath`; corregidos `testDir`, `outputDir` y reporte.
- **Suite E2E:** `tests/e2e/app.spec.js` (12 pruebas) + `auth.spec.js` (2) → **14/14 superadas** contra `hotel_lockers_test`.
- **Automatización:** nuevos `scripts/setup-test-db.ps1` y `scripts/run-e2e.ps1`; corregidos `start-dev.ps1` (`$Host`), `check-environment.ps1`, `backup-database.ps1` y `run-tests.ps1`.
- **Respaldo/restauración:** verificado con `lockerflow_app` en base aislada (156/0/0).
- **Calidad:** `php -l` 8/8, `node --check` 2/2, sintaxis PowerShell OK, sin errores de página en Playwright.
- **Sin cambios de UI/UX.**

## 2026-11-17 — Fase 1 (skills/seguridad) y Fase 2 (esquema/privilegios)
- **Skills:** `AGENTS.md` ampliado con reglas permanentes de activación automática de skills, ahorro de tokens y carga progresiva de contexto (sección 11), y reglas de entorno autorizado/datos (sección 12). Creado `.agents/skills/token-context-optimizer/SKILL.md`.
- **Seguridad:** `private/config.php` reescrito para leer `.env`/variables de entorno; sin credenciales en código. Creado `.env.example`; `.env` local no versionado. `.gitignore` corregido para versionar los `.sql` del proyecto y mantener fuera secretos.
- **Red:** verificado que `private/.htaccess` y `db/.htaccess` deniegan acceso HTTP.
- **Base de datos:** `db/schema.sql` endurecido con `uk_block_locker (block_no, locker_no)` e `idx_movements_person (person_name)`. Nueva migración idempotente `db/migrations/002_schema_hardening.sql`.
- **Entorno:** creada la base `hotel_lockers` (no existía) con 156 lockers del seed demo, 0 usuarios y 0 movimientos.
- **Privilegios:** creado `lockerflow_app` con solo `SELECT/INSERT/UPDATE/DELETE` sobre `hotel_lockers`; DDL denegado. La app deja de usar `root`.
- **Pruebas:** `php -l` OK; PDO OK (156 lockers); migración 002 idempotente; FK y unicidad verificadas con transacción revertida; smoke test `login.php` 200 / `api.php` 401.
- **Sin cambios:** no se modificó UI/UX ni se actualizaron XAMPP/PHP/MariaDB.

## 2026-11-17 — Configuración inicial (Fases 1-6)
- Auditoría completa del repositorio (Fase 1): inspección de `public/`, `private/`, `db/`, `.vscode/`, raíz; verificación de versiones (PHP 8.2.12, MariaDB 10.4.32, Node 26.13.0, Git 2.54.0); confirmación de que no hay repositorio Git.
- Creado `docs/DIAGNOSTICO.md`: estado actual, riesgos de seguridad, estructura, dependencias y recomendaciones.
- Creados 9 skills en `.agents/skills/` con su `SKILL.md` (Fase 2): `ui-ux-desktop`, `frontend-engineering`, `php-backend`, `mysql-database`, `cybersecurity`, `playwright-testing`, `clean-code-performance`, `windows-automation`, `project-memory`.
- Evaluada estructura de carpetas (Fase 3): preservada, se añadieron `scripts/` y `tests/` con entregables concretos.
- Creado `AGENTS.md` con instrucciones permanentes (Fase 4).
- Creados documentos de memoria persistente: `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/SESSION_STATE.md`, `docs/DECISIONS.md`, `docs/BACKLOG.md`, `docs/CHANGELOG.md`, `docs/DATABASE_SCHEMA.md`.
- **Fase 5 — Verificaciones automáticas:**
  - `php -l` sobre los 8 archivos PHP: 8/8 exitosos, sin errores de sintaxis.
  - `package.json` creado; `npm install --save-dev playwright` ✅ completado.
  - `npx playwright install chromium` ❌ BLOQUEADO (red inestable: ECONNRESET/timeout tras 2 intentos). `tests/playwright.config.js` configurado para usar Chrome del sistema vía `executablePath`.
  - Creados `tests/e2e/auth.spec.js` (2 pruebas E2E reproducibles), `tests/README.md`.
  - Pruebas E2E ❌ no ejecutadas: no hay servidor PHP/MySQL activo; no se inventan resultados.
- **Fase 6 — Windows y PWA:**
  - Creados scripts PowerShell: `scripts/start-dev.ps1`, `scripts/check-environment.ps1`, `scripts/run-tests.ps1`, `scripts/backup-database.ps1`.
  - Creado `.gitignore` (protege `private/config.php`, `node_modules/`, `storage/`, reportes de Playwright).
  - PWA inspeccionado: manifest, service worker, offline.html, íconos presentes. Nombre aún "LockerFlow".

## Próxima versión (pendiente)
- `git init`, credenciales en variables de entorno, Playwright Chromium instalado, pruebas E2E ejecutadas y registradas, nombre PWA ajustado a "Grand Sirenis Locker App".
