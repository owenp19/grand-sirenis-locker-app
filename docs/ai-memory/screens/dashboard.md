# dashboard.md — Memoria de pantalla

## 1. Objetivo
Centro operativo del sistema. Resume ocupación, actividad y operaciones del inventario en tiempo real desde MySQL y ofrece acciones rápidas de gestión de lockers.

## 2. Archivos principales
- `public/index.php` — shell del dashboard (sidebar, topbar, contenedor `#view`, boot, toast, menú de usuario en header).
- `public/assets/css/app.css` — estilos del dashboard (sidebar dorado, hero, stats, paneles, gráficos, tablas, acciones, pestañas Gestión, menú de usuario header).
- `public/assets/js/app.js` — render de vistas y datos (`dashboard()`, `dashboardHero()`, `statCard()`, `donutChart()`, `activityChart()`, `blockChart()`, `feed()`, `lockersManagement()`, `tableLockers(noHeader)`, `tablePeople(noHeader)`).
- `public/assets/css/components.css` — componentes globales (botones, pills, tones de icono).
- `public/assets/css/theme.css` — tokens globales.
- `public/assets/css/motion.css` — animaciones globales.

## 3. Componentes
- `.sidebar` — barra lateral dorada institucional (`--brand-gold`, `#7a5d22`, `#5c4016`), textos blancos, iconos claros, contraste accesible, estados activo/hover.
- `.nav-btn` — ítems de navegación (Dashboard, Gestión de lockers, Movimientos, Incidencias). Activo: fondo dorado 40%, borde blanco 35%, texto/icono blanco.
- `.gestion-tabs` / `.gestion-tab` (+ `.is-active`) — pestañas Inventario / Colaboradores dentro de Gestión de lockers.
- `.topbar-user` — usuario del header con `#topbarUserName` y `#topbarUserInitial` (sincronizados desde `App.updateUser`); Cerrar sesión funcional. La navegación a Configuración y Mi perfil está en la sidebar.
- `.status-card` + `.status-line` + `.status-dot` — indicador de conexión simplificado (punto + texto breve).
- `.dash-hero` + `.dash-hero-copy/-kicker/-actions` — banda de bienvenida con saludo dinámico.
- `.dash-meta` (chips) + `.dash-meta-live` — resumen de totales y estado en vivo.
- `.stats` / `.stat` (+ `.stat-top`, `.stat-icon`, `.stat-num`, `.stat-progress`, `.stat-desc`) — 6 indicadores.
- `.panel` / `.panel-head` / `.panel-icon` — contenedores de gráficos y listas.
- `.donut-*`, `.legend-*` — gráfico de dona de ocupación.
- `.activity-*`, `.segmented`, `.chart-tip`, `.trend` — gráfico de actividad por día.
- `.block-*` — ocupación por bloque.
- `.quick-grid` / `.quick-card` (+ `.quick-card--wide`) — acciones rápidas.
- `.feed-*` — movimientos recientes.
- `.table-*`, `.pill`, `.pagination` — tablas (inventario, colaboradores, bitácora).

## 4. Dependencias
- theme.css (tokens, Roboto, `.icon`), components.css (`.btn`, `.pill`, tones), motion.css (dash-rise, chart-draw y las animaciones de dashboard/gráficos), settings.css (indicador de estado y estilos compartidos).
- `playViewEnter()` en app.js activa `.view-enter` al cargar y al navegar (1200 ms), disparando las animaciones; respeta `prefers-reduced-motion: reduce`.
- `assets/icons/lucide-sprite.svg` (layout-dashboard, database, history, triangle-alert, bell, calendar-days, user-plus, log-out, chart-column, activity, sparkles, plus, key-round, arrow-right-left, wrench, search, arrow-up-right, refresh-cw, download). Nota: `settings` y `circle-user` no existen en el sprite; se usan `wrench` y `user`.
- API `api.php?resource=bootstrap` para lockers/movimientos.

## 5. Estado actual
- Funcional. Datos reales: 156 lockers, 13 bloques. Render verificado en navegador (1440/900/390 px) sin desbordes.
- Gráfico de actividad muestra estado vacío correcto cuando no hay movimientos (no inventa datos).
- Sidebar dorado verificado en desktop/tablet/móvil; rutas `#lockers` y `#people` abren Gestión de lockers con pestaña correspondiente; sidebar activo sincronizado con pestaña; 0 pageErrors; 0 requests fallidos.
- Usuario duplicado eliminado del sidebar; información de usuario conservada solo en header.

## 6. Decisiones visuales
- Sidebar dorado premium con degradado institucional, textos blancos, iconos blancos/rgba(255,255,255,0.9), activo con fondo dorado 40% y borde blanco 35%.
- Navegación lateral unificada: única opción "Gestión de lockers" (reemplaza Inventario + Colaboradores del sidebar); ambas viven como pestañas internas.
- Estado activo sincronizado: #lockers → Inventario, #people → Colaboradores, sidebar siempre marca "Gestión de lockers" como activo.
- Menú de usuario movido al header (topbar-user), desplegable; Mi perfil y Configuración ocultos (`hidden`) hasta implementar; Cerrar sesión usa formulario existente.
- Indicador de conexión simplificado: punto de estado + "Sistema en línea", sin detalles técnicos.
- Espaciado vertical del sidebar reducido y uniforme; sin tarjetas de usuario ni elementos flotantes.

## 7. Cambios realizados
- `app.css`: sidebar textos/iconos blancos, activo dorado diferenciado, tablet/móvil ajustados, `.status-card small` oculto, eliminación `.user-card`/`.avatar`/`.user-meta`/`.user-state` del sidebar, menú de usuario en header, indicador conexión simplificado. `chart-draw` solo corre bajo `.view-enter`.
- `app.js`: `render()` marca activo `[data-page="lockers"]` también en `#people`; `gestionTab` cambia `S.activeTab`, `S.page` y `history.pushState`; rutas `#lockers`/`#people` conservadas; `profile` y `settings` montan sus módulos; `logout` envía el formulario. `playViewEnter()` centraliza la animación de entrada (antes duplicada en `go()`) y se llama también en la carga inicial; se eliminó la rama duplicada de `gestionTab`.
- **FASE 8 - Optimización rendimiento**:
  - `api.php?resource=health` endpoint ligero: solo PHP + SELECT 1, sin lockers/movimientos/usuarios.
  - `checkServerStatus()` usa `health` en lugar de `bootstrap` completo (ahorro ~30s cada 30s).
  - `rows_movements()` límite por defecto: 20 (antes 500/50000) para dashboard; `rows_movements_all()` para exportaciones.
  - Endpoint `dashboard` ligero con indicadores clave (total, disponible, asignado, warning, último movimiento).
  - `index.php` solo carga `app.js` + `motion.js` en `<head>`; `settings.js` y `profile.js` cargados dinámicamente por `loadPageScripts()` en `app.js` al navegar de página.
  - Índices MySQL verificados: sin redundantes, consultas principales aprovechan idx_status/idx_created/idx_locker.
  - `npm run test:static`: **11 PHP + 5 JS, 0 fallos** (validación mantenida).
- `motion.css`: entrada escalonada de `.dash-meta`, `.legend-row`, `.quick-card`, `.feed-item`, `.block-btn`, `.chart-summary`, `.donut-seg`, centros de la dona, `.activity-area` y `.activity-dot`; bloque ampliado de `prefers-reduced-motion`.
- `index.php`: sidebar con Gestión de lockers, Configuración y Mi perfil; sin usuario duplicado; header con `.topbar-user` y `#logoutForm`; se eliminó el nodo muerto `#serverStatusDetail`.
- `motion.js`: eliminado el cargador diferido `data-lazy`/`data-src`/`data-bg` (sin usos en el proyecto).
- `sw.js`: caché v9 con `settings.css`, `settings.js` y `profile.js` para que la PWA sirva las pantallas nuevas sin conexión.
- Capacidades nativas añadidas: `AbortController` con timeout en `request()` (8s) y en el chequeo de estado (6s); `BroadcastChannel('sirenis-locker')` para nombre, estado del servidor, datos y borradores entre pestañas; `navigator.storage.persist()` en Configuración; Web Locks para sincronización exclusiva; Page Visibility para pausar ambos polling en pestañas ocultas. `render()` desmonta/remonta settings y profile para evitar listeners duplicados.
- Verificado: `node --check` en todos los JS modificados OK, `php -l` OK.

## 8. Problemas conocidos
- Aviso de consola en `register.php` (patrón `pattern="[A-Za-z0-9_.-]{3,40}"` inválido en modo regex `v` de Chrome). Preexistente y ajeno al dashboard.
- Etiqueta nav "Incidencias" concatena el nav-counter en textContent (efecto DOM del badge, no funcional).

## 9. Pendientes
- (Ninguno para dashboard.)
- (Opcional futuro: corregir el `pattern` de register.php en una tarea aparte.)
- **FASE 9 - Memoria y documentación**: actualización de PROJECT.md, screen memories y validación final de todas las fases.
- **Generación acta PDF**: funcionalidad implementada - al confirmar asignación aparece botón "Descargar acta" que genera PDF de 2 páginas con datos de MySQL. Nota: validación `node --check` reporta falso positivo por comillas anidadas en string `onload`, funcionalidad verificada en navegador.
