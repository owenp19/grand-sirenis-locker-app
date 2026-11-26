# SECURITY_GAPS — Brechas técnicas preliminares

**Estado:** hallazgos de solo lectura sobre el código. No se modificó código ni se probó producción. Las referencias son orientativas y deben validarse en el entorno real.

| ID | Hallazgo | Evidencia | Severidad | Impacto | Recomendación (sin aplicar aún) |
|---|---|---|---|---|---|
| S-01 | Exportaciones de inventario e historial sin control de rol: cualquier sesión autenticada puede descargarlos | `public/api.php:291-301` (solo `require_login` global en `api.php:4`; `backup` sí valida admin en `304`) | **ALTO** | Salida masiva de datos personales por operador | Exigir `is_admin()` para `inventory`, `history` y `backup` |
| S-02 | El proceso de salida de personal no puede completarse correctamente: `execute()` devuelve `bool` y se le llama `fetchAll()` | `public/api.php:75-76` y `92-93` | **ALTO** | Error 500; si se parchea sin cuidado puede liberar lockers sin validación real | Separar `prepare()`, `execute()` y `fetchAll()` antes de usar los resultados |
| S-03 | Ruta `POST offboarding/process` depende de `$_POST['action']`, pero el cuerpo se lee como JSON | `public/api.php:325` y `333` | **ALTO** | Endpoint inalcanzable o contradicción de origen de datos | Unificar origen de `action` desde `$body` |
| S-04 | Búsqueda de “antiguos colaboradores” consulta `users` filtrando `role='administrador'` | `public/api.php:56-60` | **ALTO** | No encuentra colaboradores; mezcla cuentas administrativas con personal | Definir fuente correcta (tabla de colaboradores o `lockers.person_name`) |
| S-05 | Validación de administrador dentro de `process_offboarding()` lee el rol desde la sesión, no desde MySQL | `public/api.php:71-72` (contrasta con `bootstrap.php::is_admin()`) | **MEDIO** | Rol revocado podría persistir hasta expirar sesión | Reutilizar `is_admin()` |
| S-06 | Texto del motivo guarda literalmente `$notes` entre comillas simples | `public/api.php:119` | **MEDIO** | Informe y auditoría con contenido incorrecto | Concatenar la variable realmente |
| S-07 | Sin registro de auditoría para exportaciones | No hay `save_movement()` ni bitácora en `api.php:291-320` | **MEDIO** | No se puede saber quién descargó datos | Registrar evento de exportación con usuario, tipo, fecha y filtered count |
| S-08 | Limitador de intentos de acceso usa archivo local y falla abierto si no puede escribir | `private/bootstrap.php:132-136`; `docs/deploy.md:140-150` | **MEDIO** | Bloqueo ineficaz si permisos o storage fallan | Verificar permisos y considerar almacenamiento centralizado |
| S-09 | No hay limitación de tasa para endpoints de API ni para descargas | `public/api.php` (solo `login.php:15` usa `login_throttle_wait`) | **MEDIO** | Abuso de `bootstrap`, búsquedas y exportaciones | Aplicar throttle por sesión/IP a lecturas sensibles |
| S-10 | `Secure` de cookie y HSTS dependen de detección directa de HTTPS | `private/bootstrap.php:14-30` | **MEDIO** | Detrás de proxy o terminación TLS externa puede no activarse | Configurar confianza de proxy y verificar cabeceras reales en Hostinger |
| S-11 | Registro inicial depende de `REMOTE_ADDR` local | `private/bootstrap.php:122-125`; `public/register.php:20-22` | **MEDIO** | Si hay proxy, la IP vista puede ser la del proxy | Restringir registro por entorno, no solo por IP |
| S-12 | Sin MFA, complejidad de contraseña limitada a longitud y sin caducidad programada | `public/register.php:50-53`; `login.php:22-43` | **MEDIO** | Robo de credenciales con acceso directo a datos | Evaluar MFA y política de credenciales para roles administrativos |
| S-13 | No hay mecanismos de rectificación/eliminación ni borrado seguro de respaldos | Esquema y `api.php` sin `DELETE`; `movements` histórico | **ALTO** (legal/técnico) | Imposibilidad operativa de atender derechos ARCO y retención | Definir procedimiento controlado y seudonimización |
| S-14 | Cuarentena de errores: `error_log()` con mensajes PDO sin normalizar | `public/login.php:46`, `public/api.php` catch final | **BAJO** | Posible fuga de estructura o datos a logs del host | Redactar y rotar logs, restringir acceso |
| S-15 | Exposición/Configuración de Hostinger sin verificar (plan, DocumentRoot, región, HTTPS real, respaldos) | `docs/deploy.md` describe la configuración deseada, no el estado desplegado | **CRÍTICO** si está mal configurado | Acceso público a credenciales y datos personales | Verificar antes de cualquier uso con datos reales |

## Controles existentes a conservar

- Consultas PDO preparadas, `EMULATE_PREPARES => false`, `password_hash`/`password_verify`.
- CSRF en formularios y `X-CSRF-Token` en API; regeneración de ID de sesión.
- Cabeceras CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS condicionado a HTTPS.
- Service worker que no cachea respuestas de API ni páginas de autenticación.
- Borradores IndexedDB sin datos personales por diseño y borrado al cerrar sesión.
