# Backlog de tareas técnicas — Grand Sirenis Locker App

Lista priorizada de tareas pendientes. Basada en el diagnóstico real y en las fases 1-4.

## Alta prioridad (inmediata)
1. **✅ HECHO — Git y `.gitignore`:** secretos fuera, `.sql`/configuración base versionados.
2. **✅ HECHO — Credenciales fuera del código:** `.env` + `.env.example`.
3. **✅ HECHO — Usuario de aplicación con privilegios mínimos:** `owenpusey` solo `SELECT/INSERT/UPDATE/DELETE` sobre `sirenis_locker_db`.
4. **✅ HECHO — Playwright operativo:** Chrome/Edge del sistema; configuración corregida.
5. **✅ HECHO — Suite E2E:** 24/24 superadas contra `hotel_lockers_test` con `owenpusey`.
6. **✅ HECHO — Respaldo/restauración:** verificado en base aislada.
7. **❌ PENDIENTE — Crear el primer administrador real** en `sirenis_locker_db`. Requiere autorización; hoy la base de desarrollo tiene 0 usuarios.
8. **❌ PENDIENTE — Contraseña para `root` de MariaDB:** definirla con autorización y ajustar scripts administrativos.

## Prioridad media
9. **✅ HECHO (parcial) — Endurecer CSP:** se eliminaron los estilos inline estáticos (tarjetas, leyendas, barras fijas) y quedan solo 6 anchos dinámicos de barras en `app.js`. Retirar `style-src 'unsafe-inline'` requiere convertir esos anchos a clases/variables.
10. **Gestión de usuarios:** listar/editar/deshabilitar cuentas y rotar contraseñas. No hay UI ni requisito actual; no implementar sin diseño.
11. **✅ HECHO — Ajustar `manifest.webmanifest` al nombre "Grand Sirenis Locker App"** (fase UI/UX, 2026-11-18).
12. **Probar restauración de un respaldo real de producción** en un entorno aislado antes de cualquier migración.

## Baja prioridad / futura (UI/UX)
13. **✅ HECHO — Design System global (Fase 5.1):** Roboto local, tokens CSS, Lucide sprite, componentes normalizados y skeletons.
14. **✅ HECHO — Welcome Page profesional (UI/UX Fase 1):** `welcome.php` + `welcome.css`, portada arena/oro, CTA a login, verificación en 4 tamaños.
15. **✅ HECHO — Rediseño de Login:** lenguaje visual de la portada, conservando autenticación y CSRF (UI/UX Fase 2).
16. **✅ HECHO — Rediseño de Register:** misma composición, placa de roles y estado restringido; **Dashboard pendiente**.
17. **Revisión de UI/UX por pantalla:** accesibilidad, responsive fino y microinteracciones (Login/Register revisados a 4 tamaños).
18. **Analítica/observabilidad local:** revisar `error_log` y rotación de logs (sin dependencias externas).
19. **✅ HECHO — Arranque en un comando y caché PWA:** `iniciar-servidor.bat` abre el Welcome sin duplicar el servidor; service worker v6 con red primero. Queda confirmar el arranque completo en el equipo del usuario.
20. **✅ HECHO — Precarga, carga diferida y animaciones:** `motion.css` + `motion.js` en Welcome, Login, Register y Dashboard, con `prefers-reduced-motion` y sin dependencias externas.

## Estado
- Welcome Hero (UI/UX Fase 3): **completado y verificado** (sin espacio artificial, footer compacto, 6 resoluciones).
- Fases 1-4: **completadas y verificadas**.
- Fase 5.1 (Design System): **completada y verificada** (E2E 14/14).
- Fase 6 (nombre e identidad): **completada**.
- UI/UX Fase 1 (Welcome Page): **completada y verificada** (90/90 en Chrome headless).
- UI/UX Fase 2 (Login y Register): **completada y verificada** (209/209 en Chrome headless).
- Arranque en un comando, precarga y movimiento: **completado y verificado** (Welcome 102/102, Login+Register 233/233, SW v6 comprobado).
- Dashboard: **pendiente** de rediseño; ya usa la capa de precarga y movimiento. **El arranque completo del `.bat` debe confirmarse manualmente.**
- Tareas 7-8: pendientes de autorización.
- Tareas 17-18: en curso / no iniciadas según el punto.

## Riesgos pendientes
- `root` de MariaDB sin contraseña en XAMPP local (la app no lo usa).
- CSP permite estilos inline por los anchos dinámicos de barras del dashboard.
- La base de desarrollo no tiene administrador; la suite usa un admin sintético en `hotel_lockers_test`.- Playwright no está instalado: la verificación de navegador se hace con Chrome headless vía DevTools Protocol.
- `app.js` se reparó (paréntesis faltante); falta confirmarlo con la suite E2E completa.
