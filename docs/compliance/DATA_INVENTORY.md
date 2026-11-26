# DATA_INVENTORY — Inventario de información

**Estado:** levantamiento estático preliminar (Fase 1). No constituye dictamen jurídico.
**Fuentes revisadas:** `db/schema.sql`, `public/api.php`, `private/bootstrap.php`, `public/login.php`, `public/register.php`, `public/index.php`, `public/assets/js/{app,settings,profile}.js`, `public/sw.js`, `docs/deploy.md`, `docs/ai-memory/PROJECT.md`.
**Alcance:** código fuente únicamente. No se accedió a producción, no se abrieron credenciales ni `.env`, no se usaron datos reales de colaboradores.

## 1. Datos personales almacenados

| Categoría | Tabla / campo | Finalidad observada | Consultado por | Acceso | Exportable |
|---|---|---|---|---|---|
| Identificador de cuenta | `users.username` | Autenticación | `login.php`, `register.php`, `api.php?resource=profile` | Titular, administrador | No en los exportadores actuales |
| Nombre del usuario | `users.display_name` | Identificación del responsable de sesión | `login.php`, `api.php` (`bootstrap`, `profile`) | Titular, administrador | No directo; aparece como `actor_name` en bitácora |
| Credencial | `users.password_hash` | Verificación de contraseña (`password_hash`/`password_verify`) | `login.php`, `register.php` | Solo backend | No |
| Rol | `users.role` | Autorización (`administrador`/`operador`) | `bootstrap.php::is_admin()`, `register.php`, `api.php` | Backend | No |
| Último ingreso | `users.last_login_at` | Control de acceso | `login.php` | Backend | No |
| Locker / ubicación | `lockers.id`, `block_no`, `locker_no` | Inventario y trazabilidad | `api.php?resource=bootstrap`, `?resource=export&type=inventory` | Administrador y operador | Sí (CSV inventario, JSON respaldo) |
| Titular del locker | `lockers.person_name` | Asignación operativa | `api.php` (`bootstrap`, `offboarding/getLockers`, `process`) | Administrador y operador | Sí |
| Departamento | `lockers.department` | Clasificación interna del titular | Ídem | Ídem | Sí |
| Jefe inmediato | `lockers.supervisor` | Contacto/responsable interno (finalidad a validar) | Ídem | Ídem | Sí |
| Condición física | `lockers.condition_label`, `status` | Estado del locker | Ídem | Ídem | Sí |
| Fecha de entrega | `lockers.assigned_date`, `source_date_raw`, `date_invalid` | Trazabilidad y saneamiento de fecha heredada | Ídem | Ídem | Sí |
| Entregó / titular previo | `lockers.delivered_by`, `previous_owner` | Trazabilidad de entregas y traslados | Ídem | Ídem | Sí |
| Motivo / observaciones | `lockers.reason`, `change_from`, `change_to`, `original_status` | Registro de cambios y salidas | Ídem | Ídem | Sí |
| Origen del dato | `lockers.source_row` | Procedencia de importación (fila de Excel) | Ídem | Ídem | Sí |
| Movimientos | `movements.action_name`, `locker_id`, `person_name`, `actor_id`, `actor_name`, `detail` | Historial de asignación, liberación, traslado, estado, corrección y validación | `api.php?resource=bootstrap`, `?resource=export&type=history` | Administrador y operador | Sí (CSV historial, JSON respaldo) |
| Snapshots | `movements.snapshot_before`, `snapshot_after` (JSON) | Evidencia del cambio | `api.php` (`save_movement`) | Administrador y operador | Sí dentro del respaldo JSON |
| Fecha del movimiento | `movements.created_at` | Orden cronológico y auditoría | Ídem | Ídem | Sí |

## 2. Registros históricos

- `movements` conserva el historial; no se identificó endpoint de borrado en `api.php`.
- La bitácora en pantalla muestra hasta 500 registros; la exportación CSV llega hasta 50 000 (`rows_movements`, `api.php:21-26`, `291-320`).
- El respaldo JSON incluye `movementsTotal`, `movementsLimit` y `movementsTruncated` para transparencia cuando hay más de 50 000.
- No hay política de retención documentada en el repositorio.

## 3. Información local (dispositivo del usuario)

| Almacén | Contenido | Datos personales | Control |
|---|---|---|---|
| Cookie de sesión `LOCKERS_HOTEL_SESSION` | ID de sesión PHP; servidor guarda `id`, `username`, `name`, `role`, `last_seen`, `started_at`, `csrf` | Indirectos / identificadores de cuenta | `HttpOnly`, `SameSite=Lax`, `Secure` solo si HTTPS detectado, 4 h inactividad / 12 h absoluta |
| IndexedDB (borradores offline, `settings.js`) | Código de locker, tipo de borrador, estado propuesto, notas operativas, fecha | Diseñado sin nombres ni departamentos | Solicitado `navigator.storage.persist()`; se borra al cerrar sesión |
| BroadcastChannel `sirenis-locker` | Nombre, rol y señales de sincronización entre pestañas | Nombre del usuario | Solo memoria del navegador |
| Cache Storage PWA (`sw.js`) | Shell estático (CSS/JS/fuentes/iconos) | No | La SW excluye `api.php`, `login.php`, `register.php`, `setup.php`, `logout.php` |
| Sin rastreadores | No hay CDN, analítica ni scripts de terceros en runtime | — | Confirmado en memoria del proyecto y manifiesto de dependencias |

## 4. Datos que no deberían recopilarse sin justificación

A validar con el responsable del hotel:
- `lockers.reason` y `movements.detail` son texto libre: pueden capturar información sensible (salud, permisos, situación laboral) sin control de contenido.
- `lockers.supervisor` y `lockers.delivered_by` incorporan nombres de terceros cuya finalidad no está documentada.
- `previous_owner` y `source_date_raw` pueden conservar datos heredados sin necesidad operativa actual.
- No se encontró campo para consentimiento, aviso de privacidad, base legal ni ejercicio de derechos ARCO.

## 5. Verificación pendiente (sin inventar)

- Plan de Hostinger, región exacta, entidad contratante y área de datos: **pendiente**.
- Versión de PHP/MySQL en producción: **pendiente** (local: PHP 8.2.12, MariaDB 10.4.32).
- Subprocesadores reales de Hostinger y contratos: **pendiente**.
- Ubicación de respaldos y cifrado: **pendiente** (`docs/deploy.md` describe procedimiento, no estado real).
