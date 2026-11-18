# Backlog de tareas técnicas — Grand Sirenis Locker App

Lista priorizada de tareas pendientes. Basada en el diagnóstico real (`docs/DIAGNOSTICO.md`).

## Alta prioridad (inmediata)
1. **Inicializar Git (`git init`)** — repositorio inexistente; `.gitignore` ya creado, excluye `private/config.php` real, respaldos y `storage/`.
2. **Mover credenciales de MySQL a variables de entorno** — `private/config.php` tiene `root` / contraseña vacía en texto plano; no commitear valores reales.
3. **Finalizar instalación de Playwright** — `npm install --save-dev playwright` ✅ completado; `npx playwright install chromium` ❌ BLOQUEADO (red inestable: ECONNRESET/timeout). `playwright.config.js` configurado para usar Chrome del sistema vía `executablePath` (si está disponible).
4. **Ejecutar al menos una prueba E2E reproducible** — ❌ BLOQUEADA: no hay servidor PHP en `127.0.0.1:8000` ni MySQL/BD `hotel_lockers` activa; navegador de Playwright no descargado. No se ejecutaron pruebas; no se inventan resultados. Requiere iniciar PHP (`scripts/start-dev.ps1`) y MySQL (XAMPP) antes de probar.
5. **Crear scripts de automatización Windows** — **HECHOS**: `scripts/start-dev.ps1`, `scripts/check-environment.ps1`, `scripts/run-tests.ps1`, `scripts/backup-database.ps1` (sin credenciales, sin Bash/WSL asumido).
6. **Configurar verificación automática** — **HECHO parcialmente**: `php -l` sobre los 8 archivos PHP: 8/8 exitosos. Falta revisión de JS y comprobaciones de seguridad automatizadas.

## Prioridad media
7. **Ajustar `manifest.webmanifest` al nombre público "Grand Sirenis Locker App"** — actualmente dice "LockerFlow | Gestión Hotelera" (Fase 6, sin cambios visuales aún).
8. **Proteger `private/`, `db/`, respaldos de descarga HTTP** — revisar `.htaccess` para Apache (ya bloquea extensiones sensibles) y comportamiento de `php -S`.
9. **Verificación de JS y seguridad básica** — pendiente (sin dependencias adicionales; revisión manual o herramientas nativas).

## Baja prioridad / futura (Fase 2 — UI/UX)
10. **Revisión de UI/UX con el skill `ui-ux-desktop`** — solo después de instalar y configurar; sin rediseño aún; validar con Playwright.
11. **Mejoras de accesibilidad y responsive** — según el skill `frontend-engineering`, sin duplicar CSS/JS.

## Estado de cada tarea
- Tareas 1-4: pendientes (Playwright en instalación background).
- Tarea 5: **HECHA** (scripts creados).
- Tarea 6: **HECHA parcialmente** (`php -l` aprobado; falta JS/seguridad).
- Tareas 7-9: pendientes (Fase 4/6).
- Tareas 10-11: bloqueadas hasta Fase 2 (no iniciar aún).
