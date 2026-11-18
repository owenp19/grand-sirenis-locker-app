# Decisiones técnicas — Grand Sirenis Locker App

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-11-17 | No usar frameworks pesados (Laravel, React, Angular, Vue, Electron) | Mantener la aplicación ligera, profesional y mantenible; solo PHP/MySQL/JS vanilla. |
| 2026-11-17 | Servidor de desarrollo: `php -S 127.0.0.1:8000 -t public`; XAMPP solo para MySQL | Coherente con el `iniciar-servidor.bat` y `.vscode/tasks.json` existentes; evita configurar Apache globalmente. |
| 2026-11-17 | Conservar estructura `public/` / `private/` / `db/` | Ya funciona y separa archivos públicos de internos; no reconstruir automáticamente. |
| 2026-11-17 | No crear carpetas que no aporten valor (`app/`, `config/`, `resources/views/`, `storage/` no se crean por ahora) | Principio YAGNI; la estructura actual es suficiente y sencilla. |
| 2026-11-17 | Skills ubicados en `.agents/skills/` | Ubicación preferida definida; cada skill con su `SKILL.md`. |
| 2026-11-17 | Nombre público deseado: "Grand Sirenis Locker App" | Instrucción del proyecto; `manifest.webmanifest` aún dice "LockerFlow" (pendiente de ajuste en Fase 6). |
| 2026-11-17 | No rediseñar UI/UX en esta primera ejecución | El skill `ui-ux-desktop` solo se instala y configura; la revisión visual es una fase independiente futura. |
