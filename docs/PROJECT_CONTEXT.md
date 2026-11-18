# Contexto del proyecto — Grand Sirenis Locker App

## Nombre y propósito
Nombre oficial: **Grand Sirenis Locker App**. El README existente lo denomina "LockerFlow · PWA local para gestionar lockers del hotel". Es una aplicación local de escritorio (PWA instalable) para administrar los lockers (casilleros) de los colaboradores de un hotel.

## Dominio
Sector hospitalidad / hoteles. El sistema gestiona el inventario de lockers, quién tiene asignado cada uno, departamento, jefe inmediato, estado del locker, fechas de entrega y una bitácora de todos los movimientos con el responsable de la sesión.

## Alcance funcional (según código real)
- Autenticación: login, registro restringido (primera cuenta solo desde `localhost`; cuentas posteriores solo por administrador), logout con CSRF.
- Dashboard: estadísticas, gráfico de distribución (donut), ocupación por bloque (13 bloques), acciones rápidas, movimientos recientes.
- Inventario: tabla de lockers con filtros por estado, bloque y búsqueda; paginación (16 por página).
- Colaboradores: titulares asignados con departamento, jefe y locker.
- Movimientos: bitácora con fecha, acción, locker y responsable; paginación (45 por página); hasta 500 recientes en pantalla, CSV completo para exportar.
- Incidencias: detección automática de inconsistencias (duplicados de titular, titular en locker disponible, asignación sin nombre, fechas no validadas, posible duplicado).
- Operaciones sobre lockers: asignar, liberar, trasladar, cambiar estado físico, editar asignación, validar/reconciliar. Cada operación usa transacción MySQL y registra movimiento con snapshots JSON (`before`/`after`).
- Exportación: inventario CSV, historial CSV, respaldo JSON.
- PWA: manifiesto, service worker con caché solo de assets estáticos, página offline. No cachea API ni datos privados; no hay sincronización offline.

## Limitaciones
- Entorno local privado; no para publicación abierta en internet.
- El bloqueo de lockers es administrativo, no controla cerraduras físicas.
- No hay base de datos offline paralela; se requiere PHP y MySQL activos.
- No se inventan movimientos históricos previos al sistema.
- 156 lockers originales importados de un Excel (archivo `db/seed.sql`, valores en hexadecimal `CONVERT(0x...)`).

## Roles de usuario
- `administrador`: crea cuentas y administra lockers.
- `operador`: administra lockers, consulta gráficos y movimientos; no crea cuentas.

## Datos sensibles
- `private/config.php` contiene credenciales de MySQL (`root` / contraseña vacía por defecto en XAMPP). Nunca commitear valores reales; mover a variables de entorno.
