# DATA_FLOW — Flujo de datos

**Estado:** mapa preliminar basado en código. No incluye datos reales ni secretos.

## 1. Flujo principal

```text
Navegador del hotel (red interna prevista)
  │  HTTPS (a confirmar en Hostinger)
  ▼
PHP 8.2 / Apache (Hostinger, EE.UU.; región exacta pendiente)
  │  bootstrap.php: sesión, CSRF, cabeceras, PDO
  ▼
MySQL / MariaDB (sirenis_locker_db; host exacto pendiente)
  │  users · lockers · movements
  ▼
Respuestas JSON → DOM de index.php → pantallas (dashboard, lockers, history, offboarding…)
  │
  ├─► IndexedDB: borradores offline (sin datos personales por diseño)
  ├─► BroadcastChannel: sincronización entre pestañas
  └─► Cache Storage PWA: solo shell estático, nunca API
```

## 2. Flujos por proceso

| Proceso | Entrada | Tratamiento | Salida / destino |
|---|---|---|---|
| Autenticación | `username`, contraseña en `login.php` | `password_verify`, regeneración de ID de sesión, `last_login_at`, limitador por usuario/IP | Cookie de sesión + redirect a `index.php` |
| Alta de usuarios | `display_name`, `username`, contraseña, rol en `register.php` | Validación, `password_hash`, rol desde MySQL | Fila en `users`; primera cuenta solo desde `127.0.0.1`/`::1` |
| Carga inicial | `GET api.php?resource=bootstrap` | `rows_lockers()` + `rows_movements()` (tope 500) | JSON con lockers, movimientos, usuario y CSRF |
| Asignación / liberación / traslado / estado | POST a `api.php` con CSRF | Transacción PDO + `save_movement()` | Actualización de `lockers` + fila en `movements` |
| Salida de personal | `GET offboarding/search`, `getLockers`; `POST offboarding/process` | Búsqueda, preview, transacción `SELECT FOR UPDATE`, limpieza de campos | Locker disponible + movimiento de liberación (requiere corrección, ver SECURITY_GAPS) |
| Exportación | `GET api.php?resource=export&type=inventory|history|backup` | CSV o JSON sin POST ni CSRF; `backup` exige administrador | Descarga al dispositivo del usuario |
| Borradores offline | Formulario de Configuración | IndexedDB local, sin sinc. automática de datos personales | Sincronización manual posterior |

## 3. Terceros y exposición

- **Hostinger:** proveedor de hosting informado; posible subencargado. Región informada: Estados Unidos; ubicación exacta pendiente.
- **Sin rastreadores ni CDN:** no hay scripts, fuentes ni analítica externa en runtime.
- **Sin APIs externas:** todas las operaciones quedan entre el navegador y el servidor propio.
- **Acceso:** previsto solo desde red interna del hotel. Si el documento raíz o el firewall permiten acceso público, el flujo queda expuesto a internet (verificación pendiente, criticidad alta).
- **Transferencia internacional:** datos de Colombia hacia EE.UU.; requiere evaluación jurídica de garantías y contrato, sin declarar cumplimiento en este documento.

## 4. Puntos de observación

- Las descargas CSV/JSON no generan entrada en `movements`: no hay evidencia interna de quién exportó datos.
- El modo offline no envía datos personales al servidor, pero las notas operativas pueden contenerlos si el usuario los escribe.
- `BroadcastChannel` replica el nombre del usuario entre pestañas del mismo origen.
- Las cabeceras de seguridad se aplican en `bootstrap.php`; HSTS solo se emite cuando PHP detecta HTTPS.
