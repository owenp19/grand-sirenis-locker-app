# profile.md — Memoria de pantalla

## 1. Objetivo
Pantalla "Mi perfil" integrada en el SPA del dashboard. Permite al usuario editar su propio nombre. El nombre de usuario y el rol son de solo lectura.

## 2. Archivos principales
- `public/index.php` — botón "Mi perfil" en la sidebar, `id="topbarUserName"` / `id="topbarUserInitial"` para sincronizar el nombre, inclusión de `profile.js` y `settings.css`
- `public/assets/js/profile.js` — módulo `window.Profile` con `mount(el)`, `unmount()` y `template(user)`; carga y guarda vía `api.php?resource=profile`; usa `AbortController` (8s) y escucha `BroadcastChannel('sirenis-locker')`
- `public/assets/js/app.js` — ruta `profile` en `PAGES`, `profileView()`, montaje/desmontaje en `render()`, `applyUser()`/`window.App.updateUser(user)` para reflejar y emitir el nombre en la topbar
- `public/assets/css/settings.css` — estilos de `.profile-fields`, `.profile-actions`, `.profile-loading` y espaciado
- `public/api.php` — `GET profile` lee el usuario de sesión; `POST profile` valida CSRF y actualiza `users.display_name` (columna real, máx. 120) y `$_SESSION['user']['name']`

## 3. Componentes
- `.profile-fields` / `.form-item` — rejilla de campos, reutilizada por "Información de la cuenta" y "Cambiar contraseña"
- `.profile-actions` — botones "Guardar cambios" y "Cambiar contraseña" con separación superior e icono alineado
- `.btn-label` — span interno del botón para cambiar el texto a "Guardando…" sin perder el icono
- `.settings-section` / `.settings-note` — reutilizados de Configuración
- `.is-hidden` — utilidad sin estilos inline

## 4. Iconos Lucide (sprite local)
Usados: `user`, `check`, `shield-check`, `lock`, `info`, `key-round`, `refresh-cw`. Todos existen en `lucide-sprite.svg` (`key`/`rotate` no existían y dejaban iconos vacíos).

## 5. Flujo
1. `go('profile')` renderiza un placeholder "Cargando perfil…" y llama a `Profile.mount(el('view'))`.
2. `GET profile` obtiene nombre, username, rol y permisos desde la sesión.
3. El guardado envía `POST profile` con `{name, username}` y header `X-CSRF-Token`; el cambio de clave envía `{action:'change-password', current_password, new_password, confirm_password}`.
4. Tras guardar, se actualiza el input con el nombre confirmado por el servidor y se llama a `App.updateUser()` para reflejarlo en la topbar. No se reemplaza `innerHTML`, evitando handlers duplicados.
5. Al salir de la vista (o al re-renderizar), `Profile.unmount()` libera referencias y `render()` vuelve a montar sobre el DOM nuevo.
6. Otro cambio de nombre en una pestaña distinta llega por `BroadcastChannel` y actualiza el campo abierto sin recargar.

## 6. Seguridad
- El username es editable pero el servidor valida formato (3-60, `[A-Za-z0-9._-]`) y unicidad; el rol es de solo lectura.
- `POST profile` exige CSRF válido y sesión activa; el servidor usa PDO preparadas.
- No se almacenan credenciales ni datos sensibles en IndexedDB; los borradores de Configuración siguen sin incluir datos personales.
- No hay `style="..."` en HTML generado; la CSP `style-src 'self'` permanece intacta.

## 7. Correcciones aplicadas
- Eliminado el estilo inline del botón de guardado.
- El botón conserva su icono durante el guardado mediante `.btn-label`.
- Sin re-render completo tras guardar: se actualizan valores y se sincroniza la topbar.
- Fase 14: disponible para operadores (botón "Mi perfil" en la sidebar). Edición de nombre y usuario
  (3-60 caracteres, único) y cambio de contraseña con verificación de la actual y revocación de sesiones.
  El listener de contraseña se enlaza dentro de `mount()`; antes quedaba inactivo.
- Corrección CSS: el bloque "Cambiar contraseña" usaba `.settings-field` / `.settings-action`, clases sin
  definir, por lo que labels e inputs aparecían sin estilo. Ahora reutiliza `.profile-fields` + `.form-item`
  + `.profile-actions` (misma apariencia que la sección de cuenta) y añade `autocomplete` apropiado.
  Los iconos `key`/`rotate` no existen en el sprite y se cambiaron por `key-round`/`refresh-cw`.
  No se modificó ningún archivo CSS.

## 8. Pendientes
- (Ninguno)
