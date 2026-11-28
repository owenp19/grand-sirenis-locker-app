# inventory.md — Memoria de pantalla

## Objetivo
Gestión de lockers (`#lockers`): pestañas Inventario y Colaboradores, búsqueda, filtros por bloque/estado, paginación y acciones de gestión.

## Archivos
- `public/assets/js/app.js` — `lockersManagement()`, `tableLockers()`, `tablePeople()`, `filterControls()`.
- `public/assets/css/management.css` — hero, chips, tabs tipo pill y tabla.

## UI (2026-11-25)
- Hero navy con contadores: total de lockers, disponibles y no disponibles.
- Acciones “Descargar CSV” y “Asignar locker” en el hero.
- Pestañas Inventario/Colaboradores como control segmentado tipo pill.
- Tabla en tarjeta con encabezados en mayúsculas y hover por fila.
- Responsive: hero apilado y pestañas a ancho completo en móvil.

## Reglas
- Los filtros y la paginación conservan su lógica existente.
- No se modifican datos desde esta vista sin pasar por los modales existentes.
- Transacción de asignación: `do_action()` confirma con `commit()` antes de retornar `certData` (acta); el movimiento de auditoría se guarda en la misma transacción y `SELECT FOR UPDATE` evita asignaciones duplicadas bajo concurrencia.
- Acta de asignación: el endpoint `assignment-certificate` consulta el casillero por su identificador exacto (nunca el último asignado global), exige rol administrador y CSRF, y devuelve `certData` con número/bloque de casillero, colaborador, documento, teléfono, área, jefe directo, fecha, año y asignado por. El acta se imprime como HTML de exactamente 2 páginas A4 con el logo oficial de Grand Sirenis, código documental 9-05, todos los datos escapados, y los campos "día de la constancia" y "firma de quien recibe" dejados vacíos. Migración `db/migrations/007_locker_document_phone.sql` agrega columnas `document` y `phone` a `lockers`.

## Corrección de asignación/liberación (2026-11-28)
- Causa del estado "sigue disponible": `submit()` hacía `await load(false)` (actualiza `S.lockers` pero **no repinta**) y luego llamaba `showCertificate(result.certData, …)` incluso en `release`, `edit`, `status`, etc., que no devuelven `certData`. Ese `TypeError` cancelaba el refresco visual; al reintentar, el locker ya estaba Asignado en MySQL y el endpoint devolvía **409** ("Ese locker ya no está disponible" / "Este locker ya no está asignado").
- `submit()` ahora repinta tras cada escritura (`await load(false,true); render()`), muestra el acta solo cuando existe `certData` y, si hay error, refresca el estado antes de reintentar.
- `load(refresh,force)` incorpora un contador de secuencia: una carga forzada posterior descarta respuestas en vuelo leídas antes de la escritura. Evita el estado obsoleto por eventos `broadcast`/`visibilitychange` concurrentes.
- Modal: el `<form id="operationForm"]>` es el hijo flex real de `.modal`; sin `display:flex; min-height:0` el `.modal-body` no podía desplazarse y los campos inferiores quedaban inalcanzables. Se añadió `flex:1 1 auto; min-height:0; overflow-y:auto` en `.modal-body` y `flex:0 0 auto` en head/foot. `body.modal-open` sigue con `overflow:hidden`.
- El campo Teléfono del modal de asignación ahora es `required` en el frontend, igual que la validación `field($d,'phone',30,true)` del backend.
- Verificado con Playwright real (sesión aislada, 1280×620): scroll del modal, acta tras asignar, tabla en "Asignado" sin recargar, tabla en "Disponible" tras liberar y **0 errores 409**. Datos de prueba restaurados.
