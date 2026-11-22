# AI Worklog — Grand Sirenis Locker App

Bitácora de trabajo asistido. Se actualiza al cerrar cada fase. No contiene secretos.

## Arquitectura identificada

- PHP 8.2 sin framework + MariaDB (`sirenis_locker_db`), PWA y JS vanilla.
- `public/` servido: `welcome.php` (portada), `login.php`, `register.php`, `index.php` (dashboard SPA ligera), `api.php`, `sw.js`, `manifest.webmanifest`.
- `private/bootstrap.php`: PDO singleton, sesión, CSRF, helpers y cabeceras. No se toca en fases de UI.
- Dashboard: `index.php` aporta el shell (sidebar, topbar, contenedor `#view`) y `app.js` renderiza cada módulo con plantillas de cadena. Navegación por hash (`#dashboard`, `#lockers`, `#people`, `#history`, `#issues`).
- CSS en cascada: `theme.css` → `app.css` (dashboard) o `welcome.css`/`auth.css` → `components.css` → `motion.css`.
- Iconos: sprite Lucide local. Tipografía: Roboto variable autoalojada.

## Tema visual global

- **Portada y autenticación:** fondo arena (`#E7DFC9`), tarjetas claras, oro (`#A5832E` / `#8F6F28`), texto taupe, tipografía grande y espaciado con `clamp()`.
- **Dashboard (fase 3):** mismo lenguaje —canvas arena cálido (`#F6F1E6`), superficies marfil (`#FFFDF8`), oro profundo para acciones (`#8F6F28`), navy (`#152B41`) como superficie estructural del sidebar y semánticos reservados a estados (azul/verde/ámbar/ocre).
- Un solo `theme-color` de marca (`#A5832E`) en Welcome, Login, Register y Dashboard.

## Archivos principales

| Ámbito | Archivos |
|---|---|
| Shell / navegación | `public/index.php`, `public/welcome.php`, `public/login.php`, `public/register.php` |
| Tokens | `public/assets/css/theme.css` |
| Dashboard | `public/assets/css/app.css`, `public/assets/js/app.js` |
| Auth / portada | `public/assets/css/auth.css`, `public/assets/css/welcome.css` |
| Componentes / movimiento | `public/assets/css/components.css`, `public/assets/css/motion.css`, `public/assets/js/motion.js` |
| PWA | `public/manifest.webmanifest`, `public/sw.js` |
| Pruebas | `tests/e2e/*.spec.js`, `tests/manual/dashboard-visual-check.js` |

## Decisiones técnicas

1. **No reconstruir:** conservar PHP, endpoints, CSRF, roles y estructura de `index.php`.
2. **Unificar el lenguaje visual hacia arena + oro**, manteniendo navy como superficie estructural y reservando verde/azul/ámbar para estados semánticos.
3. **No añadir dependencias ni frameworks.** Reutilizar tokens y componentes existentes.
4. **No tocar `private/` ni `api.php`** en las fases visuales.
5. **Accesibilidad:** texto normal ≥ 4.5:1, objetivos táctiles ≥ 44 px, foco visible dorado, navegación por teclado, `aria-current`, títulos de documento y regiones vivas acotadas.
6. **Cero estilos inline** en el HTML generado por JS para no bloquear una futura CSP estricta.
7. **Una sola fuente de verdad por estilo:** `app.css` ya no redefine botones, inputs, `.empty-icon` ni utilidades de `components.css`.

## Cambios realizados

### Fase 1 — Diagnóstico (19 nov 2026)

- Lectura de `AGENTS.md`, `docs/SESSION_STATE.md`, skills locales de UI/UX y frontend, y skill `professional-ui-ux-design`.
- Revisión estática de Welcome, Login, Register y Dashboard (PHP, CSS, JS, manifest).
- **Sin modificaciones de código.** Único archivo creado: este worklog.

### Fase 2 — Propuesta de rediseño (19 nov 2026)

**Problema.** El dashboard usa navy/teal, textos de 9–12 px y un canvas gris frío; Welcome/Auth usan arena/oro con tipografía grande. El resultado son dos productos visualmente distintos, con contraste insuficiente (botón primario 3,48:1; textos secundarios 2,3–3,2:1), CSS minificado con estilos de auth duplicados, navegación sin URL ni `aria-current`, tablas con scroll horizontal y seis estilos inline.

**Solución propuesta.**

1. Tokens cálidos compartidos y oro profundo accesible para acciones.
2. Shell operativo: topbar con contexto, sidebar navy con estado activo dorado y navegación horizontal en móvil.
3. Dashboard sin hero de marketing: encabezado compacto + metadatos reales + 4 indicadores + dona + ocupación por bloque + acciones rápidas + movimientos.
4. Gráficos con SVG y `<progress>` nativos (sin `style` inline), usando solo datos reales de la API.
5. Navegación con hash, historial, `aria-current`, título de pestaña y foco gestionado.
6. Tablas con encabezados `scope`, `caption` y patrón de tarjetas con `data-label` en móvil.
7. Modales con trampa de foco, Escape y retorno de foco.

**Beneficio.** Coherencia de marca, legibilidad AA, menor deuda CSS, navegación predecible y base preparada para CSP estricta, sin tocar lógica de negocio.

**Complejidad.** Media: 1 archivo PHP de shell, 1 hoja CSS reescrita, 1 archivo JS, ajustes puntuales en tokens/componentes y pruebas.

**Clasificación de funciones opcionales.**

- **A — Recomendadas (implementadas):** URL por módulo, `aria-current`, foco al cambiar de vista, tablas-tarjeta, progreso nativo, microinteracciones con `prefers-reduced-motion`, topbar con rol/fecha.
- **B — Opcionales (no implementadas):** búsqueda global, notificaciones, preferencias visuales, gráficos de serie temporal. Requieren datos o decisiones de producto que hoy no existen.
- **C — Descartadas:** hero promocional, botones duplicados, iconos decorativos adicionales, cualquier indicador inventado.

### Fase 3 — Implementación (19 nov 2026)

- `public/index.php`: cuerpo `dashboard-page`, enlace «Saltar al contenido», topbar con contexto/rol/fecha, sidebar con iconos Lucide y `aria-current`, navegación horizontal en móvil, skeleton accesible, región `#viewStatus` acotada y `theme-color` de marca.
- `public/assets/css/theme.css`: superficies cálidas (`--color-canvas-warm`, `--color-surface-warm`, tintas y líneas), oro profundo `#8F6F28` como `--color-primary`, foco dorado y selección dorada.
- `public/assets/css/components.css`: `.btn-primary` dorado accesible, focos dorados en inputs/selects, indicadores `<progress>`, enlace de salto y tonos semánticos.
- `public/assets/css/app.css`: reescritura completa y legible por tokens; sidebar navy con activo dorado, topbar translúcido, tarjetas, dona, barras SVG, actividad, tablas-tarjeta, modales, toasts, breakpoints unificados (1200/1024/980/720/520) y `prefers-reduced-motion`.
- `public/assets/js/app.js`: router por hash con `pushState`/`popstate`/`hashchange`, `aria-current`, título de documento, foco en `h1`, anuncios acotados, búsqueda con debounce que conserva el foco, barras SVG y `<progress>` sin estilos inline, trampa de foco/Escape/retorno en modales, estados `aria-busy` y manejo de errores de red existente.
- `public/login.php`, `public/register.php`: dejan de cargar `app.css` (ya no contiene estilos de auth) y alinean `theme-color`.
- `public/welcome.php`: alinea `theme-color`.
- `public/sw.js`: caché `v7` para servir los nuevos CSS/JS.
- `tests/e2e/app.spec.js`, `auth.spec.js`, `identity-verify.spec.js`: selectores actualizados al nuevo shell y recargas explícitas tras cambios de hash.
- `tests/manual/dashboard-visual-check.js`: verificación visual/funcional (overflow, tablas-tarjeta, historial, skip link, modal, contraste calculado).

## Hallazgos clave (resumen)

- Dashboard con paleta navy/teal y tamaños 9–12 px; Welcome/Auth con arena/oro y tamaños 16–53 px.
- `--color-primary` era oro, pero `.btn-primary` usaba teal: token y componente no coincidían.
- `theme-color` distinto por pantalla: navy en dashboard, arena en auth; manifest declaraba oro.
- `app.css` (22,7 KB, minificado) incluía estilos legacy de auth y se cargaba en Login/Register sin necesidad.
- 0 usos de `--space-*` en `app.css`, `auth.css` y `welcome.css`; espaciados fijos dispersos.
- Contraste insuficiente en textos de 9–11 px del dashboard (2,3:1–3,2:1) y en botón primario teal (3,48:1).
- Navegación por botones sin URL, sin `aria-current` ni historial; `main` con `aria-live` provocaba anuncios completos.
- Tablas con `min-width: 740px` y scroll horizontal; sin patrón de tarjetas en móvil.
- Acciones duplicadas en dashboard (page-head + hero + quick actions).

## Pruebas

- `php -l` sobre `index.php`, `login.php`, `register.php`, `welcome.php`: sin errores.
- `node --check` sobre `app.js` y las specs modificadas: sin errores.
- Suite E2E aislada (`npm run test:e2e:isolated`, base `hotel_lockers_test`, puerto 8001): ver resultado en la sección «Resultado de verificación».
- Verificación visual con `tests/manual/dashboard-visual-check.js`: 1440/1180/900/390 px, overflow horizontal, tablas-tarjeta, navegación por historial, skip link, modal y contraste.

## Resultado de verificación

- Pendiente de registrar la última ejecución.

## Fase 0 — Preparación del agente y optimización de tokens (20 nov 2026)

### Archivos analizados

- `AGENTS.md` (instrucciones permanentes del proyecto).
- `docs/AI_WORKLOG.md`, `docs/SESSION_STATE.md`, `docs/BACKLOG.md`, `docs/DECISIONS.md`, `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_SCHEMA.md`, `docs/DIAGNOSTICO.md`, `docs/CHANGELOG.md`, `docs/ASSET_LICENSES.md`.
- `.agents/skills/` (10 skills locales): token-context-optimizer, project-memory, ui-ux-desktop, frontend-engineering, php-backend, mysql-database, cybersecurity, clean-code-performance, playwright-testing, windows-automation.
- `public/index.php`, `private/bootstrap.php`, `db/migrations/002_schema_hardening.sql`, `package.json`.
- Estructura de `public/*.php`, `public/assets/css/`, `public/assets/js/`, `private/`, `db/`, `scripts/`, `tests/`.

### Hallazgos

- La documentación coincide con el código real en estructura de archivos, cascada de CSS (`theme.css` → `app.css`/`auth.css` → `components.css`), helpers de `bootstrap.php` (`h()`, `csrf_token()`, `field()`, `valid_date()`, `respond()`, `fail()`), conexiones PDO preparadas, cabeceras de seguridad y esquema de BD (`users`, `lockers`, `movements`).
- **Discrepancias menores documentadas:**
  1. `db/migrations/002_schema_hardening.sql` existe pero no está referenciado en `AGENTS.md`, `AI_WORKLOG.md`, `SESSION_STATE.md` ni `BACKLOG.md` (solo se documenta `001_roles_usuarios.sql`).
  2. `package.json` declara `playwright` y `@playwright/test` como `devDependencies`, pero `SESSION_STATE.md` reporta que Playwright no es instalable (red bloqueada) y se usa Chrome headless vía CDP como alternativa. Existe `tests/playwright-report/` con resultados previos.
  3. `AI_WORKLOG.md` indica "Resultado de verificación: Pendiente de registrar la última ejecución", mientras `BACKLOG.md` reporta E2E 14/14 superadas contra `hotel_lockers_test`.
- Se cargaron 9 de 10 skills (todas excepto `windows-automation`, diferido según instrucciones).
- No se modificó código (regla de Fase 0).

### Cambios realizados

- Ninguno (solo lectura y registro en este worklog).

### Pruebas

- Ninguna ejecutada en esta fase (verificación estática de documentos vs. código únicamente).

### Pendientes

1. Alinear `AGENTS.md`/`BACKLOG.md` con la existencia de `db/migrations/002_schema_hardening.sql`.
2. Resolver la contradicción sobre Playwright (¿instalable o no?) entre `package.json` y `SESSION_STATE.md`.
3. Registrar el resultado de verificación E2E pendiente en `AI_WORKLOG.md`.
4. Mantener `docs/SESSION_STATE.md` y `docs/CHANGELOG.md` alineados en cada entrega.
5. Siguiente paso recomendado: continuar desde el estado real — el Dashboard sigue pendiente de rediseño (arena + oro) sin tocar lógica de lockers ni endpoints.

## Fase 1 — Welcome Page: Hero Section (20 nov 2026)

### Archivos analizados

- `public/welcome.php`, `public/assets/css/welcome.css`, `public/assets/css/motion.css`.
- `scripts/build-icons.js`, `public/assets/icons/lucide-sprite.svg`.
- Paquete `node_modules/lucide-static` (estructura y `sprite.svg`).
- Medición real con Playwright/Chromium en 6 resoluciones.

### Hallazgos

- **Causa del espacio:** `.welcome-stage::after` (`width/height: 420px`, `bottom: -270px`) es un descendiente absoluto que suma *scrollable overflow*. Medido: **+282 px** de `scrollHeight` en todos los tamaños (270 px del `bottom` negativo + ~12 px de la deriva `motion-orbit`). El footer ya estaba dentro del stage (p. ej. 1920×1080: stage 1080, footer bottom 1072).
- **Segundo problema (visibilidad):** el footer tenía `data-reveal`. El `IntersectionObserver` usa `rootMargin: 0 0 -6% 0` y `threshold: 0.08`; al quedar anclado al borde inferior, en tablet/móvil nunca alcanzaba el 8 % de intersección y permanecía con `opacity: 0` incluso tras hacer scroll.
- El paquete `lucide-static@1.74.0` instalado distribuye `sprite.svg` y `icon-nodes.json`, no la carpeta `icons/` que esperaba `build-icons.js`; `heart` no existía en el sprite de la app.

### Cambios realizados

- `public/assets/css/welcome.css`:
  - `min-height` adaptativo con `100svh`/`100dvh` en `.welcome-page` y `.welcome-stage`.
  - `.welcome-stage` recorta solo los anillos decorativos con `overflow-x: visible; overflow-y: clip` (no oculta contenido real; el contenido siempre cabe).
  - Footer más compacto (`padding-top` reducido) y nuevos `.welcome-footer-made` / `.welcome-heart` (corazón dorado).
- `public/welcome.php`: footer actualizado a «© 2026 Grand Sirenis Locker App» y «Hecho con ♥ por Owen Pusey.» con `<use href="...#heart">` y texto `sr-only` «amor» para lectores de pantalla. Se retira `data-reveal` del footer para garantizar visibilidad.
- `scripts/build-icons.js`: se añade `heart` y el lector de origen admite `lucide-static/sprite.svg` (además de `icons/`), sin instalar dependencias. Sprite regenerado con `npm run icons:build` (33 iconos).
- `public/assets/css/motion.css`: revisado, **sin cambios**; la deriva `motion-orbit` queda recortada por `overflow-y: clip`.

### Pruebas

Playwright/Chromium en 1920×1080, 1440×900, 1366×768, 768×1024, 390×844 y 390×667:

| Métrica | Resultado |
|---|---|
| `overflowY` escritorio | 0 (hero ocupa el viewport) |
| `scrollHeight - stage.bottom` (espacio artificial) | 0 en todos los tamaños |
| `overflowX` | 0 en todos |
| Footer `opacity` (carga y tras scroll) | 1 en todos |
| Footer dentro del stage | Sí |
| Corazón Lucide (`use#heart`) | Presente y visible (13 px) |
| CTA visible / destino | Sí / `login.php` |
| Errores de consola / `pageerror` | 0 |

- `php -l public/welcome.php`: sin errores.
- `node --check scripts/build-icons.js` y `node --check public/assets/js/motion.js`: sin errores.
- Validación visual: escritorio 1440×900 y móvil 390×844 (fondo con footer visible).
- Sin cambios en Login, Register ni Dashboard.

### Pendientes

1. Revisar si otros elementos `data-reveal` anclados al borde inferior (auth/dashboard) sufren el mismo umbral; fuera de alcance de esta fase (no se modifican esas pantallas).
2. Mantener el sprite regenerado desde el paquete instalado; si se actualiza `lucide-static`, volver a ejecutar `npm run icons:build`.
3. CSP sigue con `style-src 'unsafe-inline'` (sin cambios en esta fase).
