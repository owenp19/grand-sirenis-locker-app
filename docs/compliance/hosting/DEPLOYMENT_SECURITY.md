# DEPLOYMENT_SECURITY — Seguridad en el despliegue en Hostinger

**Objetivo:** Arquitectura segura para alojar Grand Sirenis Locker App en Hostinger (EE. UU.) con acceso restringido al hotel.

## 1. Configuración del servidor (apache / php / mysql)

| Elemento | Configuración recomendada | Justificación |
|---|---|---|
| **DocumentRoot** | `public/` (nunca raíz del proyecto) | Evita exposición de `private/`, `db/`, `.env` |
| **AllowOverride** | `All` en directorio `public/` | Permitir `.htaccess` para reglas de reescritura |
| **Require all denied** | En `private/`, `db/`, `.env` | Bloqueo directo de acceso a archivos sensibles |
| **X-Content-Type-Options** | `nosniff` | Ya aplicado en `bootstrap.php` |
| **X-Frame-Options** | `DENY` | Ya aplicado en `bootstrap.php` |
| **Referrer-Policy** | `no-referrer` | Ya aplicado en `bootstrap.php` |
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains` | Solo si HTTPS termina en el host |
| **Content-Security-Policy** | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self';` | Ya aplicado en `bootstrap.php`; reforzar en `.htaccess` si es necesario |
| **php.ini `display_errors`** | `Off` | Evitar fugas de información en logs |
| **php.ini `expose_php`** | `Off` | Ocultar que el servidor corre PHP |
| **PDO `EMULATE_PREPARES`** | `FALSE` | Ya en `bootstrap.php`; mantener |
| **Session.cookie_httponly** | `1` | Ya en `bootstrap.php` |
| **Session.cookie_samesite** | `Lax` | Ya en `bootstrap.php` |
| **Session.gc_maxlifetime** | `14400` (4 h) | Ya en `bootstrap.php` |

## 2. Restricción de acceso por IP (Hotel)

| Mechanisma | Descripción | Implementación |
|---|---|---|
| **Lista blanca de IPs** | Solo permitir conexiones desde el rango IP del hotel (ej. `192.168.1.0/24` o rango empresarial) | `.htaccess` con `<Require ip 192.168.1.0/24>` o configuración de firewall de Hostinger |
| **VPN del hotel** | Acceso mediante túnel IPSec/SSL VPN | Recomendado sobre lista de IPs fijas |
| **Firewall de Hostinger** | Bloqueo de puertos 22 (SSH), 3306 (MySQL) desde internet | Solicitar a soporte de Hostinger |
| **Protección de administración** | Panel hPanel solo accesible desde IP del hotel | Configurar en hPanel → Seguridad → Acceso restringido |

## 3. Protección de la base de datos MySQL

| Elemento | Configuración | Comentario |
|---|---|---|
| **Host de conexión** | `127.0.0.1` (localhost) o socket Unix | Evitar `%` o IP pública en el usuario |
| **Usuario de BD** | Mínimos privilegios: SELECT, INSERT, UPDATE, DELETE sobre `sirenis_locker_db` | Nunca `root`, ni `%` de host |
| **Procedimientos almacenados** | Para operaciones críticas (liberación, exportación) | Evitar sentencias SQL puras en API cuándo sea posible |
| **Firewall MySQL** | `skip-networking` o binding a `127.0.0.1` solo | Si MySQL está en el mismo host que PHP |
| **Respaldos de BD** | `mysqldump` + cifrado PGP/AES | Almacenar en `storage/backups/` fuera de `public/` |
| **Auditoría** | `log_bin`, `slow_query_log` | Revisar logs mensualmente, sin datos personales |

## 4. HTTPS y terminación TLS

| Caso | Acción |
|---|---|
| **HTTPS con certificado propio** | Comprar/ solicitar Let's Encrypt en Hostinger; configurar en Apache `virtualhost *:443` |
| **HTTPS detrás de proxy** | Si Hostinger termina TLS, configurar `SetEnvIf X-Forwarded-Proto https HTTPS=on` y confiar en `X-Forwarded-Proto` |
| **HSTS** | `Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains" solo si se controla elterminación TLS |
| **HTTP/2** | Habilitar si el plan lo permite y hay certificado válido |

## 5. Configuración de .htaccess (ejemplo)

```apache
# Proteger archivos sensibles
<FilesMatch "\.(env|env\.example|sql|sql\.gz|db|config)\.">
    Order Allow,Deny
    Deny from all
</FilesMatch>

# Bloquear acceso directo a php en uploads/
<FilesMatch "\.php$">
    Order Allow,Deny
    Deny from all
    # Excepto los necesarios
    <FilesMatch "(index\.php|api\.php)$">
        Allow from all
    </FilesMatch>
</FilesMatch>

# Denegar métodos no autorizados
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} !^(GET|POST|PUT|DELETE|OPTIONS)$
    RewriteRule .* - [F]
</IfModule>

# Seguridad adicional: bloquear user-agents conocidos maliciosos
SetEnvIfNoCase User-Agent "^ scraper|harvest|extract|email|loader|curl|python" bad_bot
<Limit GET POST>
    Order Allow,Deny
    Allow from all
    Deny from env=bad_bot
</Limit>
```

## 6. Recuperación ante desastres

| Estrategia | Descripción | Responsable |
|---|---|---|
| **Backup diario automatizado** | `mysqldump` a `storage/backups/backup-YYYYMMDD.sql.gz` con cifrado GPG | Operaciones Hostinger / Usuario |
| **Restauración de prueba** | Cada 30 días restaurar en entorno aislado y verificar integridad | Encargado |
| **Failover** | Si el plan lo permite, configurar réplica de BD en segundo plano | Hostinger (según plan) |
| **Plan de contingencia** | Si se comprometen datos: notificar a titulares, autoridad (SIC), cambiar credenciales, rotar API keys | Hotel + Desarrollador |

## 7. Pendientes de configurar en Hostinger

- `[ ]` Verificar DocumentRoot apunta a `public/`
- `[ ]` Aplicar `.htaccess` con `Require all denied` a `private/`, `db/`
- `[ ]` Configurar firewall: bloquear puertos 22, 3306 a internet
- `[ ]` Solicitar y activar certificado SSL (Let's Encrypt o propio)
- `[ ]` Configurar HSTS solo si se controla la terminación TLS
- `[ ]` Crear usuario MySQL con privilegios mínimos (no root, no `%`)
- `[ ]` Probar acceso solo desde IP del hotel (VPN o whitelist)
- `[ ]` Programar backup diario y test de restauración cada mes