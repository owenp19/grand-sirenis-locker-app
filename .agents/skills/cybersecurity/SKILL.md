# Skill: cybersecurity

**Nombre:** Cybersecurity Specialist  
**Ubicación:** `.agents/skills/cybersecurity/SKILL.md`  
**Procedencia:** Skill personalizado creado para Grand Sirenis Locker App  
**Estado:** Instalado y configurado (Fase 2)  
**Versión:** 1.0.0

---

## Descripción

Especialista en ciberseguridad defensiva para la aplicación Grand Sirenis Locker App. Aplica buenas prácticas basadas en OWASP y controles apropiados para un entorno local PHP/MySQL. Su responsabilidad es proteger la aplicación contra inyecciones, XSS, CSRF, accesos no autorizados, IDOR, filtración de credenciales y exposición de información interna.

Este skill se activa cuando se revisa la seguridad de endpoints, formularios, sesiones, archivos de configuración, rutas o dependencias.

**Reglas críticas:**
- Las claves de API, contraseñas y secretos nunca se almacenan en el frontend ni se incluyen en Git.
- Usar variables de entorno o mecanismos seguros equivalentes.
- No exponer mensajes de error internos al usuario final.
- No almacenar secretos en archivos de memoria accesibles públicamente.
- En Windows, evaluar exposición de puertos, permisos de archivos y configuración del servidor.

---

## Estado actual de seguridad (desde el código real)

### Controles implementados
| Control | Implementación | Archivo |
|---|---|---|
| Protección SQL Injection | PDO con consultas preparadas, `EMULATE_PREPARES => false` | `private/bootstrap.php`, `public/api.php` |
| Hash de contraseñas | `password_hash` / `password_verify` (mínimo 12 caracteres) | `public/register.php`, `public/login.php` |
| Tokens CSRF | `csrf_token()` (`random_bytes(32)`), validación con `hash_equals` | `private/bootstrap.php`, formularios, `api.php` |
| Sesiones seguras | `session.use_strict_mode=1`, `HttpOnly`, `SameSite=Lax`, `secure` sobre HTTPS, `session_regenerate_id(true)` | `private/bootstrap.php`, `login.php`, `logout.php`, `register.php` |
| Cabeceras de seguridad | CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: private, no-store` | `private/bootstrap.php` |
| Control de intentos | Bloqueo tras 8 intentos, ventana de 15 min, por sesión | `public/login.php` |
| Autorización por roles | `administrador` / `operador`; verificación en MySQL no solo en sesión | `public/register.php`, `public/index.php` |
| Bloqueo de primera cuenta | `GET_LOCK('lockerflow_first_user', 8)` y comprobación `localhost` | `public/register.php` |
| Transacciones con bloqueo | `FOR UPDATE`, `beginTransaction`/`commit`/`rollBack` | `public/api.php` |
| No exposición de errores internos | `display_errors=0`, `error_log`, respuestas genéricas al cliente | `private/bootstrap.php`, `public/api.php` |
| Protección CSV contra inyección de fórmulas | Prefijo `'` a valores que empiezan por `=+@-\t\r` | `public/api.php` (`csv_output`) |
| PWA sin datos privados | `sw.js` no cachea API ni rutas de autenticación | `public/sw.js` |
| Acceso restringido a archivos sensibles | `.htaccess` deniega `.sql`, `.md`, `.ini`, `.env`, `.bak`, `.zip` (solo Apache) | `.htaccess` |

### Riesgos identificados
| # | Riesgo | Gravedad | Recomendación |
|---|---|---|---|
| C1 | `private/config.php` con `root` / contraseña vacía en texto plano | Media | Mover credenciales a variables de entorno; excluir de Git |
| C2 | `private/` no bloqueado para `.php` en `.htaccess` | Media | Con Apache, denegar acceso a `private/*.php` |
| C3 | Sin repositorio Git ni `.gitignore` | Baja | Inicializar Git y crear `.gitignore` |
| C4 | Puerto 8000 expuesto en `127.0.0.1` solo (localhost) | Baja | Mantener en loopback; no exponer a red sin HTTPS |
| C5 | Sin auditoría de dependencias automatizada | Baja | No hay dependencias externas; revisar extensiones PHP |

---

## Especialización

- Protección contra SQL Injection.
- Prevención de XSS (escape de salida con `htmlspecialchars`, ya en helper `h()`).
- Protección CSRF.
- Validación de entradas (longitud, formato, valores permitidos, fechas).
- Control de sesiones (regeneración, tiempo de inactividad 4 horas, cookies seguras).
- Autenticación segura y manejo de contraseñas.
- Permisos basados en roles (RBAC).
- Prevención de accesos no autorizados (endpoints y vistas).
- Prevención de IDOR (verificar propiedad/permiso sobre el recurso solicitado).
- Control de intentos de acceso (forceo de credenciales).
- Seguridad de rutas (solo POST para mutaciones, CSRF en header para API).
- Protección de archivos internos (`private/`, `db/`, respaldos).
- Auditoría de dependencias (extensiones PHP, no hay npm/composer).

---

## Reglas de trabajo

1. Antes de cualquier cambio en código que maneje datos de usuario, revisar `private/bootstrap.php` y los helpers existentes.
2. Nunca almacenar secretos en el frontend ni commitear `config.php` con valores reales.
3. Usar `getenv()` / `$_ENV` o un archivo `.env` fuera de la raíz pública para credenciales.
4. Respuestas de error al cliente deben ser genéricas; el detalle va a `error_log`.
5. Las mutaciones de estado requieren método POST y token CSRF válido.
6. Validar que el usuario autenticado tenga permiso sobre el recurso (evitar IDOR).
7. No desactivar cabeceras de seguridad ni CSP sin análisis de impacto.
8. En Windows: verificar que `php -S` solo escuche en `127.0.0.1` (no `0.0.0.0`) y que MySQL no esté expuesto a internet.

---

## Condiciones de activación

- Se revisan o modifican endpoints (`api.php`) o formularios (`login.php`, `register.php`).
- Se cambian configuraciones de sesión, autenticación o autorización.
- Se tocan archivos de configuración o credenciales.
- Se reporta un posible incidente de seguridad.
- Se requiere auditoría de dependencias o revisión OWASP.

---

## Procedimientos de trabajo

1. Identificar el vector de ataque (inyección, XSS, CSRF, sesión, IDOR, exposición de archivos).
2. Revisar el control existente en `bootstrap.php` o `api.php`.
3. Proponer el refuerzo mínimo necesario sin romper funcionalidad.
4. Verificar que no se expongan mensajes de error internos.
5. Si se cambian credenciales, actualizar documentación sin incluir valores reales.
6. Registrar hallazgos y acciones en `docs/SESSION_STATE.md` y `docs/CHANGELOG.md`.

---

## Recursos de referencia

- `private/bootstrap.php` (sesiones, CSRF, cabeceras, helpers)
- `private/config.php` (credenciales; manejar con cuidado)
- `public/api.php`, `public/login.php`, `public/register.php`, `public/logout.php`
- `.htaccess`
- `docs/DIAGNOSTICO.md`

---

## Scripts auxiliares

Ninguno requerido en esta fase.
