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
