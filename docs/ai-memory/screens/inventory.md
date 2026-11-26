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
