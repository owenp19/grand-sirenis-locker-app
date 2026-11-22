# Changelog — Grand Sirenis Locker App

## 2026-11-21 — Cambio de base de datos y usuario de aplicación
- **Base de datos:** renombrada de `hotel_lockers` a `sirenis_locker_db` (utf8mb4, InnoDB). Datos copiados: 156 lockers, 0 usuarios, 0 movimientos.
- **Usuario de aplicación:** creado `owenpusey`@`%` con contraseña `Sirenis2026!App` y privilegios mínimos (`SELECT, INSERT, UPDATE, DELETE` sobre `sirenis_locker_db.*`). Se retira el uso de `lockerflow_app` y `root` en la app.
- **Configuración:** `.env` y `.env.example` actualizados (`DB_NAME=sirenis_locker_db`, `DB_USER=owenpusey`, `DB_PASSWORD=Sirenis2026!App`). `private/config.php` lee el nombre por defecto `sirenis_locker_db` y el usuario por defecto `owenpusey`.
- **Esquema y migraciones:** `db/schema.sql` y todas las migraciones (`001` a `006`) apuntan a `sirenis_locker_db`. El rol por defecto de `users.role` es ahora `operador` (principio de menor privilegio).
- **Scripts de PowerShell:** `start-dev.ps1`, `setup-test-db.ps1`, `backup-database.ps1`, `reset-admin-user.php` y `inspect-users.php` actualizados para usar `sirenis_locker_db` y `owenpusey`.
- **Pruebas:** las 24 pruebas E2E pasan contra `hotel_lockers_test` (recreada desde `sirenis_locker_db`) con el usuario `owenpusey`. Se corrigió una corrupción de codificación en los valores ENUM `status` (`Dañado`, `Revisión`) provocada por `mysqldump` en Windows; se restauraron los valores correctos con PHP/PDO (UTF-8).
- **Verificación:** `php -l` OK en todos los PHP modificados; `node --check` OK en JS.

## 2026-11-20 — UI/UX Fase 3: Welcome Hero (footer y fin del espacio artificial)
- **Espacio vertical:** el exceso de 282 px bajo el pie lo generaba `.welcome-stage::after` (`bottom: -270px`, altura 420 px) más la deriva de `motion-orbit`, que sumaban scroll real. El stage ahora recorta solo los anillos decorativos con `overflow-y: clip` (sin ocultar contenido real).
- **Hero a pantalla completa:** `min-height` con `100svh`/`100dvh` en página y stage; footer compacto integrado en el hero. En escritorio el scroll es 0; en tablet/móvil solo aparece cuando el contenido lo exige.
- **Footer:** «© 2026 Grand Sirenis Locker App» y «Hecho con ♥ por Owen Pusey.» con icono Lucide `heart` (nuevo en el sprite). Se retira `data-reveal` del pie para garantizar su visibilidad (el observador con `-6%` y `0.08` no lo revelaba al quedar anclado al borde inferior).
- **Generador de iconos:** `scripts/build-icons.js` añade `heart` y lee `lucide-static/sprite.svg` (la versión instalada ya no trae `icons/`), manteniendo compatibilidad con ambos formatos. Sprite final: 33 iconos.
- **Pruebas:** Playwright/Chromium en 1920×1080, 1440×900, 1366×768, 768×1024, 390×844 y 390×667: `overflowY` 0 en escritorio, `scrollHeight - stage.bottom` = 0 en todos, `overflowX` 0, footer `opacity: 1` en carga y tras scroll, corazón presente, CTA visible y navega a `login.php`, 0 errores de consola. `php -l` y `node --check` OK. Sin cambios en Login, Register ni Dashboard.

## 2026-11-18 — Arranque en un comando, precarga, carga diferida y animaciones
- **Páginas viejas:** causa identificada en `public/sw.js` (cache-first con caché `v5`). Ahora `grand-sirenis-locker-shell-v6` con **red primero** para CSS/JS del shell y respaldo en caché sin conexión.
- **`iniciar-servidor.bat`:** arranque único; detecta PHP de XAMPP, evita duplicar el servidor en el puerto 8000, inicia MySQL si 3306 está cerrado y abre `/` (Welcome). `scripts/start-dev.ps1` y `npm start` también abren `/`.
- **Movimiento:** nuevos `public/assets/css/motion.css` y `public/assets/js/motion.js` con capa de precarga, revelado `[data-reveal]` por `IntersectionObserver`, carga diferida de imágenes/fondos, actualización del service worker, brillo de botones, elevación al pasar el cursor y deriva ambiental. Respeta `prefers-reduced-motion`.
- **Pantallas:** `welcome.php`, `login.php`, `register.php` e `index.php` integran precarga, estilos/script de movimiento y atributos de revelado. Sin cambios en autenticación, roles, CSRF, endpoints ni CSP.
- **Corrección:** la transición del revelado se declara en el estado base; declararla en `.is-revealed` dejaba transiciones pendientes en Chrome 157 y podía ocultar contenido.
- **Pruebas:** Welcome 102/102, Login+Register 233/233, identidad estática 64/64, `php -l` 9/9, `node --check` OK. Service worker v6 verificado por CDP: controla la página y cachea los 17 recursos.

## 2026-11-18 — UI/UX Fase 2 (Login y Register) y ajuste del Welcome
- **Login:** `public/login.php` rediseñado con el lenguaje arena + oro de la portada. Tarjeta blanca flotante, placa de inventario en CSS, chips informativos, enlace "Volver a la portada" y logo wordmark de 720 px. Formulario, CSRF, alertas y `auth.js` intactos.
- **Register:** `public/register.php` con la misma composición y placa de equipo/roles. Se conservan el flujo de primer administrador, los roles, el estado restringido y todos los ids de campos.
- **Estilos:** `public/assets/css/auth.css` reescrito en secciones legibles (~900 líneas): tokens `--a-*`, foco dorado, botón `#8F6F28` con texto blanco (4,7:1), alertas, estado restringido, responsive ≤1080/≤900/≤520 px y ajuste para alturas ≤860 px. Sin dependencias nuevas.
- **Welcome:** hero sin cambios; se ancló el pie al borde inferior y el hero se centra en el espacio disponible, eliminando la banda vacía bajo el pie.
- **Rendimiento:** precarga de Roboto y logo, sin peticiones externas ni imágenes nuevas (ninguna licencia adicional).
- **Pruebas:** nuevo `tests/manual/auth-verify.js` → 209/209 en Chrome headless (CDP) en 4 tamaños, con interacciones reales de contraseña, coincidencia, rechazo CSRF y navegación. Welcome 90/90 revalidado; identidad estática 49/49; `php -l` OK.

## 2026-11-18 — UI/UX Fase 1 (Welcome Page)
- **Portada pública:** nueva `public/welcome.php`, primera pantalla sin sesión. Logo oficial, título "Bienvenido a Grand Sirenis Locker App", descripción, CTA "Iniciar sesión" hacia `login.php` y aviso "Acceso exclusivo para personal autorizado."
- **Estilos:** nueva `public/assets/css/welcome.css` (arena + oro, tokens de `theme.css`, `box-sizing` aislado, `prefers-reduced-motion`). Sin JavaScript y sin recursos externos.
- **Ilustración:** panel de 32 lockers construido en CSS; no se usaron modelos 3D ni recursos de terceros.
- **Navegación:** `index.php` redirige a `welcome.php` cuando no hay sesión; `welcome.php` redirige a `index.php` con sesión activa. `manifest.start_url` → `./welcome.php`.
- **Rendimiento:** logo optimizado a 720 px (`grand-sirenis-locker-app-logo-black-720.png`, 25 KB frente a 221 KB del original) con preload de fuente y logo; sin lazy-load porque no hay imágenes fuera de pantalla.
- **PWA:** `sw.js` pasa a caché `grand-sirenis-locker-shell-v5` e incluye `welcome.css` y el logo optimizado.
- **Corrección:** faltaba un `)` en `issuesPage()` de `app.js`; impedía parsear todo el archivo desde la Fase 5.1.
- **Pruebas:** 90/90 comprobaciones reales en Chrome headless (CDP) en 1920×1080, 1366×768, 768×1024 y 390×844; 47/47 verificación estática; `php -l` 9/9. Playwright sigue sin poder ejecutarse.

## 2026-11-18 — Corrección de nombre e identidad visual
- **Nombre del directorio:** corregido de `Grand-Sirenis-Loker-app` a `Grand-Sirenis-Locker-app`.
- **package.json / package-lock.json:** nombre del paquete actualizado a `grand-sirenis-locker-app`.
- **.vscode/tasks.json:** tarea VS Code renombrada a "Grand Sirenis Locker: iniciar PHP".
- **manifest.webmanifest:** nombre actualizado a "Grand Sirenis Locker App", `short_name` a "Sirenis Locker", colores de marca (`background_color: #E7DFC9`, `theme_color: #A5832E`).
- **sw.js:** caché renombrada a `grand-sirenis-locker-shell-v4` (hoy v5).
- **theme.css:** agregados tokens de marca Grand Sirenis (`--brand-gold`, `--brand-gold-light`, `--brand-secondary`, `--brand-sand`, `--brand-taupe`, `--color-primary`, `--color-primary-soft`, `--color-secondary`) y variantes accesibles de estados (hover, active, disabled, focus, fondos de éxito/advertencia/error).
- **Imágenes renombradas en `public/assets/image/`:** `grand-sirenis-locker-app-favicon.png`, `grand-sirenis-locker-app-logo-black.png`, `grand-sirenis-locker-app-logo-white.png`, `grand-sirenis-locker-app-icon-windows.png` (originales conservados para recuperación). Todos los PNG con transparencia real (RGBA) verificada.
- **Favicon actualizado** a PNG en `index.php`, `login.php`, `register.php`, `offline.html`.
- **Logos integrados:** logo negro en encabezados de login y register (fondos claros). Nombre de marca visible cambiado de "LockerFlow" a "Grand Sirenis Locker App" en pantallas.
- **Comentarios JS/CSS actualizados** de "LockerFlow" a "Grand Sirenis Locker App".
- **Logo dorado y símbolo dorado:** sin imagen disponible (no se inventaron recursos inexistentes).

## 2026-11-17 — Fase 5.1 (Design System global)
- **Tipografía:** Roboto variable local (`public/assets/fonts/roboto-latin.woff2`, `roboto-latin-ext.woff2`), `font-display: swap`, pesos 100–900. Sin Google Fonts ni CDN.
- **Tokens:** nuevo `public/assets/css/theme.css` con color, tipografía, fondos, bordes, sombras, espaciados, radios, estados, animaciones, layout y utilidades (`.icon`, `.sr-only`, reduced motion).
- **Componentes:** nuevo `public/assets/css/components.css` que normaliza botones, inputs, tablas, tarjetas, modales, badges, menús, alertas, estados vacíos, skeletons y tonos semánticos. Orden de carga: `theme.css` → `app.css`/`auth.css` → `components.css`.
- **Iconos:** Lucide `lucide-static@1.74.0` (ISC) como sprite local generado por `scripts/build-icons.js` (`npm run icons:build`, 32 iconos, ~6,5 KB). Helper `icon()` en `app.js`; iconos accesibles y con color del tema.
- **Pantallas:** `index.php`, `login.php`, `register.php` y `offline.html` migrados a tokens e iconos; skeleton del dashboard; `sw.js` v3 cachea los nuevos assets.
- **Menos estilos inline:** `app.js` de 9 a 6 atributos `style` (solo anchos dinámicos); colores de tarjetas/leyendas a clases; `auth.js` usa `.is-valid`/`.is-invalid`.
- **Licencias:** nuevo `docs/ASSET_LICENSES.md` (Roboto Apache 2.0, Lucide ISC) y política de recursos visuales en `AGENTS.md` y `.agents/skills/ui-ux-desktop/SKILL.md`.
- **Pruebas:** Playwright 14/14, `node --check` 2/2, `php -l` 3/3; sin errores de consola; revisión visual en escritorio y móvil.

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
- `git init`, credenciales en variables de entorno, Playwright Chromium instalado, pruebas E2E ejecutadas y registradas.
