# Changelog — Grand Sirenis Locker App

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
