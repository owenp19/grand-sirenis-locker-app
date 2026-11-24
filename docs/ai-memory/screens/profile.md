# profile.md — Memoria de pantalla

## 1. Objetivo
Pantalla "Mi perfil" integrada en el SPA del dashboard. Permite al usuario editar su propio nombre. El nombre de usuario y el rol son de solo lectura.

## 2. Archivos principales
- `public/index.php` — botón "Mi perfil" en la sidebar, `id="topbarUserName"` / `id="topbarUserInitial"` para sincronizar el nombre, inclusión de `profile.js` y `settings.css`
- `public/assets/js/profile.js` — módulo `window.Profile` con `mount(el)`, `unmount()` y `template(user)`; carga y guarda vía `api.php?resource=profile`
- `public/assets/js/app.js` — ruta `profile` en `PAGES`, `profileView()`, montaje/desmontaje en `render()`, y `window.App.updateUser(user)` para reflejar el nombre en la topbar
- `public/assets/css/settings.css` — estilos de `.profile-fields`, `.profile-actions`, `.profile-loading` y espaciado
- `public/api.php` — `GET profile` lee el usuario de sesión; `POST profile` valida CSRF y actualiza `users.name` y `$_SESSION['user']['name']`

## 3. Componentes
- `.profile-fields` — rejilla de campos (nombre editable, username y rol de solo lectura)
- `.profile-actions` — botón "Guardar cambios" con separación superior
- `.btn-label` — span interno del botón para cambiar el texto a "Guardando…" sin perder el icono
- `.settings-section` / `.settings-note` — reutilizados de Configuración
- `.is-hidden` — utilidad sin estilos inline

## 4. Iconos Lucide (sprite local)
Usados: `user`, `check`, `shield-check`, `lock`, `info`. Todos existen en `lucide-sprite.svg`.

## 5. Flujo
1. `go('profile')` renderiza un placeholder "Cargando perfil…" y llama a `Profile.mount(el('view'))`.
2. `GET profile` obtiene nombre, username, rol y permisos desde la sesión.
3. El guardado envía `POST profile` con `{name}` y header `X-CSRF-Token`.
4. Tras guardar, se actualiza el input con el nombre confirmado por el servidor y se llama a `App.updateUser()` para reflejarlo en la topbar. No se reemplaza `innerHTML`, evitando handlers duplicados.
5. Al salir de la vista, `Profile.unmount()` libera referencias.

## 6. Seguridad
- Username y rol no se pueden modificar desde el frontend ni desde el endpoint.
- `POST profile` exige CSRF válido y sesión activa; el servidor usa PDO preparadas.
- No se almacenan credenciales ni datos sensibles en IndexedDB; los borradores de Configuración siguen sin incluir datos personales.
- No hay `style="..."` en HTML generado; la CSP `style-src 'self'` permanece intacta.

## 7. Correcciones aplicadas
- Eliminado el estilo inline del botón de guardado.
- El botón conserva su icono durante el guardado mediante `.btn-label`.
- Sin re-render completo tras guardar: se actualizan valores y se sincroniza la topbar.

## 8. Pendientes
- (Ninguno)
