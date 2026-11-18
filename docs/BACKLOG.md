# Backlog de tareas técnicas — Grand Sirenis Locker App

Lista priorizada de tareas pendientes. Basada en el diagnóstico real y en las fases 1-4.

## Alta prioridad (inmediata)
1. **✅ HECHO — Git y `.gitignore`:** secretos fuera, `.sql`/configuración base versionados.
2. **✅ HECHO — Credenciales fuera del código:** `.env` + `.env.example`.
3. **✅ HECHO — Usuario de aplicación con privilegios mínimos:** `lockerflow_app` solo `SELECT/INSERT/UPDATE/DELETE`.
4. **✅ HECHO — Playwright operativo:** Chrome/Edge del sistema; configuración corregida.
5. **✅ HECHO — Suite E2E:** 14/14 superadas contra `hotel_lockers_test`.
6. **✅ HECHO — Respaldo/restauración:** verificado en base aislada.
7. **❌ PENDIENTE — Crear el primer administrador real** en `hotel_lockers`. Requiere autorización; hoy la base de desarrollo tiene 0 usuarios.
8. **❌ PENDIENTE — Contraseña para `root` de MariaDB:** definirla con autorización y ajustar scripts administrativos.

## Prioridad media
9. **Endurecer CSP:** eliminar `style-src 'unsafe-inline'` moviendo estilos inline a CSS (implica UI; fase posterior).
10. **Gestión de usuarios:** listar/editar/deshabilitar cuentas y rotar contraseñas. No hay UI ni requisito actual; no implementar sin diseño.
11. **Ajustar `manifest.webmanifest` al nombre "Grand Sirenis Locker App"** (fase UI/UX).
12. **Probar restauración de un respaldo real de producción** en un entorno aislado antes de cualquier migración.

## Baja prioridad / futura (UI/UX)
13. **Revisión de UI/UX** con `ui-ux-desktop`: accesibilidad, responsive, nombre PWA.
14. **Analítica/observabilidad local:** revisar `error_log` y rotación de logs (sin dependencias externas).

## Estado
- Fases 1-4: **completadas y verificadas**.
- Tareas 7-8: pendientes de autorización.
- Tareas 9-14: no iniciadas (UI/UX fuera de alcance de estas fases).

## Riesgos pendientes
- `root` de MariaDB sin contraseña en XAMPP local (la app no lo usa).
- CSP permite estilos inline por necesidades visuales actuales.
- La base de desarrollo no tiene administrador; la suite usa un admin sintético en `hotel_lockers_test`.
