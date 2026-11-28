# offboarding.md — Memoria de pantalla

## 1. Objetivo

Pantalla "Salida de personal" administrativa que permite registrar la liberación de lockers de colaboradores que ya no trabajan en el hotel. El módulo busca al colaborador, muestra sus lockers asignados y permite al administrador seleccionar cuáles liberar, generando un historial auditoría.

## 2. Archivos principales

- `public/index.php` — incluye el botón "Salida de personal" en la sidebar (solo administradores) y la inclusión de `app.js`
- `public/assets/js/app.js` — vista `offboardingView()`, enrutado `PAGES.offboarding`, manejadores de eventos para búsqueda, preview y procesamiento
- `public/assets/css/app.css` — estilos de la pantalla offboarding (reutiliza tokens `--d-surface`, `--d-gold-soft`, `--color-primary`)
- `public/api.php` — endpoints `resource=offboarding&action=search`, `getLockers`, `process` (POST) con validación administrativa, transacciones SQL y `SELECT FOR UPDATE`
- `private/bootstrap.php` — helpers de autorización `is_admin()`, `require_login()`, `csrf_token()`, sin cambios
- `db/schema.sql` — estructura de tablas `users`, `lockers`, `movements`, sin cambios

## 3. Flujo de trabajo

### 3.1 Búsqueda de colaborador

1. El administrador hace clic en "Salida de personal" en la sidebar.
2. Se muestra la vista con un campo de búsqueda y botón "Buscar".
3. El administrador ingresa el nombre completo del colaborador (se normalizan espacios, mayúsculas, minúsculas y acentos en el backend).
4. El sistema consulta `api.php?resource=offboarding&action=search` y muestra:
   - Si hay **ninguna coincidencia**: mensaje "No se encontraron coincidencias".
   - Si hay **una coincidencia exacta**: se muestra el preview directo con los lockers del usuario.
   - Si hay **múltiples coincidencias**: se muestra una lista con lockers, departamento y estado para que el admin seleccione.

### 3.2 Previsualización

Al seleccionar un único colaborador:

- Se muestra el nombre completo y departamento.
- Se listan los lockers asignados a esa persona con su estado actual (Asignado, Ocupado, etc.).
- Se muestra el contador de lockers a liberar.
- El botón "Confirmar liberación" se habilita solo cuando hay lockers seleccionados.

### 3.3 Confirmación y procesamiento

1. El admin revisa los lockers a liberar y hace clic en "Confirmar liberación".
2. El sistema vuelve a validar la sesión administrativa consultando MySQL directamente.
3. Se verifica que los lockers sigan asignados a la persona seleccionada.
4. Se inicia una transacción SQL con `SELECT FOR UPDATE` para bloquear los registros.
5. Para cada locker:
   - Se cambia el estado a `Disponible`.
   - Se limpian los campos: `person_name`, `department`, `supervisor`, `assigned_date`, `delivered_by`.
   - Se registra un movimiento en la tabla `movimientos` con acción `Liberación`, incluyendo:
     - Quién fue el titular antes.
     - Quién procesó la liberación (administrador).
     - Motivo de la salida y fecha.
     - Estado final del locker.
6. Se confirma la transacción. Si hay algún error, se hace rollback y no se aplican cambios parciales.

### 3.4 Informe final

Tras completar la operación, se muestra un informe en pantalla con:

- Nombre del colaborador.
- Fecha y hora de la liberación.
- Administrador que realizó la operación.
- Cantidad de lockers encontrados.
- Cantidad liberada.
- Cantidad que ya estaba disponible.
- Cantidad con errores (y el motivo).
- Identificadores de lockers procesados.
- Estado final de cada locker.

El informe permite imprimir o exportar a CSV usando las capacidades nativas del navegador.

## 4. Seguridad implementada

- **Autorización administrativa**: Cada petición al endpoint `process` re-verifica que la sesión tenga rol `administrador` consultando la base de datos (`is_admin()`).
- **Protección CSRF**: El formulario y los fetch requests incluyen el header `X-CSRF-Token` generado por `csrf_token()`.
- **Consultas PDO preparadas**: Todas las sentencias SQL usan placeholders y `execute()`, evitando inyección SQL.
- **Validación de entradas**: Los campos `reason`, `outcome`, `date` y `lockerIds` se validan en servidor antes de procesar.
- **SELECT FOR UPDATE**: Se bloquean los registros de lockers durante la transacción para evitar race conditions.
- **Rollback automático**: Si ocurre cualquier error durante la transacción, se deshacen todos los cambios (`$db->rollBack()`).
- **No operation sin conexión**: El modo offline nunca permite liberar lockers; la operación requiere comunicación activa con la API PHP/MySQL.
- **Sin datos personales en IndexedDB**: Los borradores o caché no almacenan datos sensibles del colaborador.

## 5. Estados visuales

- **Buscando**: Se muestra spinner o estado de carga mientras la API responde.
- **Colaborador encontrado**: Preview con datos del usuario y lockers.
- **Sin coincidencias**: Mensaje claro indicando que no hay registros con ese nombre.
- **Coincidencias ambiguas**: Lista para que el admin seleccione el correcto.
- **Confirmación pendiente**: El usuario revisa los lockers antes de confirmar.
- **Procesando**: Estado visual durante la transacción SQL.
- **Operación completada**: Informe visible con resumen y acciones de imprimir/exportar.
- **Operación fallida**: Mensaje de error con detalles de qué lockers no se procesaron y por qué.

## 6. Convenios de diseño

- Se reutiliza el tema global: `--d-surface` (fondo), `--d-gold-soft` (fondo suave para pasos), `--color-primary` (acentos).
- Se usa la fuente Roboto local y los iconos Lucide mediante sprite.
- Todos los mensajes de UI están en español.
- No se usan librerías externas ni CDN.
- La CSS usa variables CSS definidas en `theme.css` y `app.css`.

## 7. Reparación de la API de salida de personal (Fase 2)

- `public/api.php`: `process_offboarding` inicializa la conexión antes de usarla; las rutas GET `search`/`getLockers` leen `$db` ya inicializado y exigen rol `administrador`.
- La búsqueda consulta titulares reales de `lockers` (agrupados por titular) en vez de `users`, con normalización de acentos; los homónimos se resuelven mediante selección explícita del administrador. Nunca se libera por coincidencia parcial de nombre.
- Se corrigieron `prepare()`/`execute()`/`fetchAll()` (el `execute` devuelve bool, no statement) y los placeholders `IN (?, ?, ...)` válidos.
- Los IDs de locker se sanan (cadenas alfanuméricas, únicos, lista no vacía); nunca se ejecutan `DELETE` sobre movimientos históricos.
- El proceso valida el rol administrador, inicia la transacción, bloquea con `SELECT FOR UPDATE`, verifica dentro de la transacción el estado y el titular de cada locker, conserva el historial de movimientos, aplica `rollback` ante cualquier fallo y genera informe de liberados / ya disponibles / errores.
- Se corrigió la interpolación de observaciones (`$notes` se concatena correctamente).
- `public/assets/js/app.js`: `offboardingSearch` y `offboardingConfirm` envían el cuerpo como JSON (`action`, `lockerIds`, `person`, `reason`, `notes`, `outcome`, `date`) para que los parámetros lleguen al backend.

## 6. Pendientes

- Realizar pruebas E2E con una base de datos aislada.
- Probar los casos: colaborador con un locker, varios lockers, nombre inexistente, nombre con acentos, personas con nombres iguales, locker ya disponible, operator intentando acceder, solicitud sin CSRF, error durante la transacción, solicitud duplicada.
- Verificar que el historial de movimientos permanezca intacto después de la operación.
## Actualización UI (2026-11-25)
- Nueva hoja offboarding.css cargada en index.php.
- Hero navy, stepper de 3 pasos, tarjetas con iconos y resumen de confirmación.
- Icono de sidebar cambiado de log-out a user.
- Sin cambios de lógica ni endpoints.
- Fase 14: acceso habilitado también para operadores creados por el administrador. Se eliminaron los
  bloqueos de rol en `search`, `getLockers` y `process`; el botón de sidebar ya no depende de `$isAdmin`.
