# Backlog de tareas técnicas — Grand Sirenis Locker App

Lista priorizada de tareas pendientes. Basada en el diagnóstico real (`docs/DIAGNOSTICO.md`) y en la sesión del 2026-11-17.

## Alta prioridad (inmediata)
1. **✅ HECHO — Git y `.gitignore`:** repositorio existente (`master`), `.gitignore` corregido (secretos fuera, `.sql` del proyecto versionados).
2. **✅ HECHO — Credenciales fuera del código:** `private/config.php` lee `.env`; `.env` no versionado; `.env.example` con placeholders.
3. **✅ HECHO — Usuario de aplicación con privilegios mínimos:** `lockerflow_app` solo `SELECT/INSERT/UPDATE/DELETE` sobre `hotel_lockers`; la app no usa `root`.
4. **❌ BLOQUEADO — Playwright Chromium:** `npx playwright install chromium` falla por red (`ECONNRESET`/timeout). `tests/playwright.config.js` usa Chrome del sistema.
5. **❌ PENDIENTE — Ejecutar pruebas E2E:** requiere servidor PHP activo + MariaDB + navegador. No se ejecutaron ni se inventaron resultados. Además, validar registro/login exige autorización para crear la primera cuenta de administrador.

## Prioridad media
6. **Base de datos:** `✅ HECHO` esquema `db/schema.sql` con InnoDB/utf8mb4, FK, índices, `uk_block_locker`; migración `002` idempotente; base `hotel_lockers` creada con 156 lockers demo.
7. **Documentar/validar backup-restore:** `scripts/backup-database.ps1` existe; falta probar restauración en un entorno de prueba (no sobre datos reales).
8. **Ajustar `manifest.webmanifest` al nombre público "Grand Sirenis Locker App"** — actualmente dice "LockerFlow | Gestión Hotelera" (sin cambios visuales aún).
9. **Verificación de JS y seguridad básica** — pendiente (revisión manual o herramientas nativas; sin dependencias nuevas).

## Baja prioridad / futura (UI/UX)
10. **Revisión de UI/UX con el skill `ui-ux-desktop`** — fase separada, aún no iniciada; sin rediseño.
11. **Mejoras de accesibilidad y responsive** — según `frontend-engineering`, sin duplicar CSS/JS.

## Estado de cada tarea
- Tareas 1-3: **HECHAS**.
- Tarea 4: **BLOQUEADA** por red.
- Tarea 5: **PENDIENTE** (bloqueada por 4 y por autorización para crear admin).
- Tarea 6: **HECHA** (esquema, migración y privilegios verificados).
- Tarea 7: **PENDIENTE** (script listo, restauración no probada).
- Tareas 8-9: pendientes.
- Tareas 10-11: no iniciadas (UI/UX fuera de alcance de esta fase).

## Riesgos pendientes
- **`root` de MariaDB sin contraseña (XAMPP local):** la app ya no usa `root`, pero la cuenta administradora sigue sin clave. Definir una clave requiere autorización porque afecta las tareas administrativas y scripts locales; no se modificó en esta fase.
- **Playwright sin navegador instalado:** pruebas E2E no verificadas; no se declaran como exitosas.
