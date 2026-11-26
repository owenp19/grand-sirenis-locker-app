# history.md — Memoria de pantalla

## Objetivo
Bitácora de movimientos (`#history`): historial de asignaciones, liberaciones, traslados, estados físicos, correcciones y validaciones, con búsqueda y exportación CSV.

## Archivos
- `public/assets/js/app.js` — `movementsPage()`, `filterControls('history')`, `pager()`.
- `public/assets/css/management.css` — hero, toolbar, panel y timeline.

## UI (2026-11-25)
- Hero navy con chips: total de registros, coincidencias y orden cronológico.
- Botón “Exportar historial” en el hero.
- Barra de búsqueda en tarjeta propia.
- Timeline en panel con icono por tipo de movimiento, pill de locker, descripción y responsable.
- Responsive: hero apilado y metadatos en columna en móvil.

## Reglas
- No inventar registros históricos previos al sistema.
- Solo lectura; la exportación usa `data-action="exportHistory"`.
