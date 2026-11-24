# settings.md — Memoria de pantalla

## 1. Objetivo
Pantalla Configuración con modo de trabajo sin conexión, borradores locales (IndexedDB) y sincronización segura con el servidor PHP/MySQL. Interfaz clara y sencilla usando tema global, Roboto, iconos Lucide y componentes existentes.

## 2. Archivos principales
- `public/index.php` — Shell del dashboard; incluye botón "Configuración" en sidebar, indicador de estado del servidor dinámico, enlace a settings.css y settings.js
- `public/assets/css/settings.css` — Estilos de Configuración (secciones, toggle, estados de conexión, borradores, sincronización, seguridad)
- `public/assets/js/settings.js` — Lógica: IndexedDB (borradores), comprobación de conexión (ping + bootstrap), sincronización con detección de conflictos, renderizado de UI, `AbortController`, `BroadcastChannel`, `navigator.storage.persist()`, Web Locks y Page Visibility
- `public/assets/js/app.js` — Ruta `settings` en PAGES, función `settingsView()`, montaje/desmontaje de `window.Settings`, comprobación periódica de estado del servidor (cada 30s) con Page Visibility y BroadcastChannel
- `public/api.php` — Endpoint `resource=ping` (solo PHP + sesión, sin MySQL) para distinguir servidor caído de MySQL caído
- `private/bootstrap.php` — Sesiones, CSRF, `require_login()`, `is_admin()`, helpers de seguridad (sin cambios)
- `public/sw.js` — Service Worker existente; ya excluye rutas de API del caché (sin cambios)

## 3. Componentes
- `.settings-section` — contenedor de sección con encabezado y cuerpo
- `.settings-section-head` / `.settings-section-icon` — encabezado de sección con icono
- `.preference-row` / `.preference-toggle` — toggle de preferencia (Preparar cambios sin conexión)
- `.connection-state` / `.connection-dot` — indicador de estado (online/offline/warning/syncing)
- `.draft-item` / `.draft-list` / `.draft-badge` — borradores locales (estado NO SINCRONIZADO / sincronizado)
- `.draft-form` / `.draft-type-selector` — formulario para crear borradores
- `.sync-status` / `.sync-actions` — estado y acciones de sincronización
- `.settings-note` — notas informativas (info/warn/success)
- `.settings-hint` — texto secundario bajo la nota de offline; muestra `#storagePersistenceText` (checking/active/denied/unavailable)
- `.is-hidden` — utilidad para ocultar sin `style=` inline (CSP `style-src 'self'`)
- `.drafts-header` / `.sync-results` — espaciado entre borradores, resultados y botones
- Reutiliza: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.form-item`, `.icon`, `.notice`, `.toast`, `.connection-bar` de components.css y theme.css

## 4. Iconos Lucide (sprite local)
Usados: `database`, `triangle-alert`, `pencil`, `activity`, `wrench`, `refresh-cw`, `shield-check`, `lock`, `user`, `info`, `circle-check`, `x`, `check`. (Nota: `settings`, `circle-user`, `sync`, `cloud-off` no existen en el sprite; se sustituyen por `wrench`, `user`, `refresh-cw`, `triangle-alert` respectivamente.)

## 5. Flujo de trabajo sin conexión
### Estados de conexión (comprobación real, no solo `navigator.onLine`):
1. **Conectado**: `api.php?resource=ping` OK + `api.php?resource=bootstrap` OK → PHP y MySQL disponibles
2. **Sin acceso al servidor**: error de red en ping → PHP no disponible (o sin internet)
3. **MySQL no disponible**: ping OK pero bootstrap falla (503) → PHP vivo, MySQL caído
Comprobación cada 30s + eventos `online`/`offline`. Con Page Visibility el polling se detiene con la pestaña oculta y se reanuda al volver. Los `fetch` llevan `AbortController` (8s en API, 6s en estado) para no quedar colgados. Nunca se muestra "Sistema en línea" sin verificar el servidor.

### Sincronización entre pestañas (BroadcastChannel `sirenis-locker`)
- `app.js` emite `user` (nombre de perfil), `serverStatus` y `data` (datos operativos cambiados).
- `settings.js` emite `drafts` al crear/borrar/sincronizar y escucha `drafts`, `serverStatus` y `data`.
- `profile.js` escucha `user` y actualiza su campo sin recargar.
- `render()` desmonta y vuelve a montar settings/profile en cada re-render para no duplicar listeners.

### Persistencia y concurrencia
- `navigator.storage.persist()` se solicita al montar; el resultado se muestra en `#storagePersistenceText`. Si no hay soporte, se marca "no disponible" sin romper la UI.
- `navigator.locks.request('locker-drafts-sync', { ifAvailable: true })` evita que dos pestañas sincronicen a la vez; si no hay soporte, se sincroniza directamente.

### Preferencia: "Preparar cambios sin conexión"
Toggle que habilita la creación de borradores locales. No simula conexión ni permite operaciones que requieran confirmación del servidor.

### Borradores (IndexedDB, solo datos no sensibles):
- **Observación operativa**: locker + notas operativas (sin nombres ni datos personales)
- **Propuesta de estado físico**: locker + estado propuesto + notas
- Identificados como **NO SINCRONIZADOS** (badge rojo)
- No permiten: asignaciones definitivas, liberaciones, traslados, modificación de usuarios, cambios de permisos
- Vínculados al usuario de sesión; otro usuario no ve borradores ajenos (filtro por `user` en IndexedDB)
- No se guardan contraseñas, tokens, credenciales ni datos personales innecesarios

## 6. Sincronización segura
- No automática: requiere acción manual del usuario ("Sincronizar ahora")
- Antes de aplicar: consulta estado actual del servidor, comprueba autenticación y permisos
- Detección de conflictos: compara estado actual del locker en servidor con el propuesto en el borrador
- No sobrescribe datos nuevos con información antigua
- Evita operaciones duplicadas (borradores ya sincronizados se eliminan de IndexedDB)
- Confirma antes de aplicar (UI de revisión)
- Si hay conflictos: estado "Conflicto detectado", se muestran para revisión manual

## 7. Experiencia de usuario
Estados mostrados claramente: Conectado / Sin acceso al servidor / Borradores pendientes / Sincronizando / Conflicto detectado / Sincronización completada.

## 8. Seguridad
- IndexedDB solo almacena datos operativos (código de locker, tipo, notas, fecha) — sin datos personales
- No se almacena nada privado en Cache Storage del Service Worker (API ya excluida)
- El modo offline no elude autenticación ni autorización (`require_login` en api.php)
- No se simulan sesiones autenticadas mientras el servidor está inaccesible (401 redirige a login)
- Al cambiar de usuario de sesión, los borradores se filtran por usuario actual

## 9. Correcciones de UI/CSP aplicadas
- Se eliminaron todos los `style="..."` del HTML generado por `settings.js` y de `index.php`; se usan clases (`.is-hidden`, `.drafts-header`, `.sync-results`).
- El error `renderDraftList is not defined` se corrigió usando `render()` en `loadDrafts()` y `clearAllDrafts()`.
- Se añadió separación visual entre el aviso de conflicto y los botones de sincronización, y entre formularios, listas y acciones.
- "Estado físico" vuelve a funcionar como tipo de borrador propuesto; la opción del sprite es `wrench`.
- `#syncResults` dejó de ser un contenedor muerto: ahora muestra cada resultado con `.settings-note success/warn`.
- Los listeners de `offline` y de delegación de borradores son funciones con nombre y se retiran en `unmount()` (antes se acumulaban al volver a montar).
- La CSP no se relajó: sigue siendo `style-src 'self'`.

## 10. Pendientes
- (Ninguno)
- Pruebas pendientes: desconexiones, reconexiones, cierre de sesión, conflictos
