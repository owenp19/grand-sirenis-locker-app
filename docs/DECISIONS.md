# Decisiones técnicas — Grand Sirenis Locker App

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-11-17 | No usar frameworks pesados (Laravel, React, Angular, Vue, Electron) | Mantener la aplicación ligera, profesional y mantenible; solo PHP/MySQL/JS vanilla. |
| 2026-11-17 | Servidor de desarrollo: `php -S 127.0.0.1:8000 -t public`; XAMPP solo para MySQL | Coherente con el `iniciar-servidor.bat` y `.vscode/tasks.json` existentes; evita configurar Apache globalmente. |
| 2026-11-17 | Conservar estructura `public/` / `private/` / `db/` | Ya funciona y separa archivos públicos de internos; no reconstruir automáticamente. |
| 2026-11-17 | No crear carpetas que no aporten valor (`app/`, `config/`, `resources/views/`, `storage/` no se crean por ahora) | Principio YAGNI; la estructura actual es suficiente y sencilla. |
| 2026-11-17 | Skills ubicados en `.agents/skills/` | Ubicación preferida definida; cada skill con su `SKILL.md`. |
| 2026-11-17 | Nombre público deseado: "Grand Sirenis Locker App" | Instrucción del proyecto. |
| 2026-11-18 | Directorio corregido de `Grand-Sirenis-Loker-app` a `Grand-Sirenis-Locker-app` | Error ortográfico en el nombre de la carpeta raíz. |
| 2026-11-18 | `manifest.webmanifest` renombrado a "Grand Sirenis Locker App" / "Sirenis Locker" | Identidad visual oficial; colores de marca integrados. |
| 2026-11-18 | Paleta de colores Grand Sirenis integrada en `theme.css` | Tokens `--brand-gold`, `--brand-secondary`, `--brand-sand`, `--brand-taupe` y variantes accesibles de estado. |
| 2026-11-18 | Imágenes renombradas y rutas actualizadas | Favicon PNG, logo negro en login/register; logo dorado y símbolo dorado sin imagen disponible. |
| 2026-11-17 | No rediseñar UI/UX en esta primera ejecución | El skill `ui-ux-desktop` solo se instala y configura; la revisión visual es una fase independiente futura. |
| 2026-11-17 | Credenciales fuera del código: `private/config.php` lee `.env`/variables de entorno | Evita secretos en Git y permite rotar la contraseña sin tocar código. `.env` no se versiona. |
| 2026-11-17 | Versionar `db/**/*.sql` y `private/config.php` (sin secretos) | Reproducibilidad: el esquema, las migraciones y la configuración base deben estar en Git; solo `.env` queda fuera. |
| 2026-11-17 | Usuario de aplicación `lockerflow_app` con privilegios mínimos | Principio de menor privilegio; `root` queda solo para administración manual. |
| 2026-11-21 | Usuario de aplicación cambiado a `owenpusey` sobre `sirenis_locker_db` | `lockerflow_app` retirado; la app usa `owenpusey` con privilegios `SELECT/INSERT/UPDATE/DELETE` solo sobre `sirenis_locker_db`. |
| 2026-11-21 | Base de datos renombrada de `hotel_lockers` a `sirenis_locker_db` | Nombre acorde a la identidad del proyecto (Grand Sirenis → sirenis_locker_db); datos copiados con respaldo previo; `.env`, `schema.sql` y migraciones actualizadas.
| 2026-11-17 | Migración `002_schema_hardening.sql` idempotente con `ADD INDEX IF NOT EXISTS` | Permite aplicarla con seguridad sobre bases existentes sin recrear tablas. |
| 2026-11-17 | `db/seed.sql` se considera baseline/demo | No son datos reales de colaboradores; no se presentan como producción. |
| 2026-11-17 | Sesiones PHP en lugar de JWT/API keys | Frontend y backend son del mismo origen; la sesión con cookie `HttpOnly`/`SameSite` reduce superficie y complejidad. |
| 2026-11-17 | Rate limit de login en archivo local con `flock` | No añade tablas ni dependencias; sobrevive a la limpieza de cookies y se limpia solo. |
| 2026-11-17 | Playwright usa Chrome/Edge del sistema | Evita la descarga de Chromium bloqueada por red y prueba el mismo motor que el usuario. |
| 2026-11-17 | E2E contra `hotel_lockers_test` recreada desde dump | Aísla datos sintéticos, permite repetir la suite y no altera la base de desarrollo. |
| 2026-11-17 | No implementar endpoints de usuarios no usados por la UI | KISS/YAGNI: solo alta de usuarios; listar/editar/eliminar no tiene flujo actual. |
| 2026-11-17 | Roboto variable autoalojada (WOFF2, Apache 2.0) como tipografía global | Coherencia visual y rendimiento sin depender de Google Fonts ni CDN; `font-display: swap`. |
| 2026-11-17 | Lucide mediante sprite SVG generado en build (`lucide-static`, ISC) | Evita cargar el runtime completo y el CDN; solo se empaquetan los iconos usados. |
| 2026-11-17 | CSS en tres capas: `theme.css` (tokens) → `app.css`/`auth.css` (layout) → `components.css` (componentes) | Escalable y sin duplicación; los componentes globales normalizan sin reescribir cada página. |
| 2026-11-17 | Conservar la identidad visual y ampliarla con tokens semánticos | Continuidad para el usuario y menor riesgo de regresión; el rediseño por página queda para la siguiente fase. |
| 2026-11-17 | Solo recursos originales, CC0 o con licencia comercial verificada | Evita riesgos legales; procedencia y licencias registradas en `docs/ASSET_LICENSES.md`. |
