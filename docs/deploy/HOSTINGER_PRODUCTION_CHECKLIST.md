# Hostinger Production Checklist - Grand Sirenis Locker App

**IMPORTANTE**: Revisa cada ítem antes de poner la aplicación en producción. 
No todas las opciones están disponibles en todos los planes de Hostinger. 
Verifica en tu hPanel qué características están disponibles para tu cuenta.

---

## 1. Identificar el Tipo de Servicio Hostinger

- [ ] **Web Hosting** — Plan compartido. DocumentRoot suele ser `public_html/` o la carpeta del plan.
- [ ] **Cloud Hosting** — VPS ligero con acceso root. Puedes configurar tu propio DocumentRoot.
- [ ] **VPS** — Servidor virtual privado completo. Tú controlas el sistema operativo y servicios.

**Cómo verificarlo en hPanel**:
1. Ingresa a hPanel → **Account Settings** → **Service Details**
2. Observa el tipo de servicio (Shared, Cloud, o VPS)
3. Nota la ruta base indicada (ej. `public_html/` para Web Hosting)

**Ubicación del servidor**: DESCONOCIDA por defecto. 
En hPanel → **Server Settings** podrías ver la región, pero no la compartas públicamente.

---

## 2. Garantizar que solo public/ sea accesible

### Para Web Hosting (shared plan):
- [ ] En hPanel → **File Manager**, verifica que `public_html` sea tu DocumentRoot.
- [ ] Mueve todos los archivos de la carpeta `public/` a `public_html/` **O** configura `public/` como DocumentRoot si el panel lo permite.
- [ ] **Nunca** dejes `api.php`, `login.php`, `register.php`, `setup.php` al mismo nivel que `public_html/` sin protección.
- [ ] Verifica que `.htaccess` en `public/` funcione (en hosting compartido a veces requiere `AddHandler` o `Options +FollowSymLinks`).

### Si el plan NO permite configurar public/ como DocumentRoot:
Opción A — Mover todo a `public_html`:
```bash
mv public/* public_html/
mv assets/ public_html/assets/
mv index.php public_html/index.php
# ... demás archivos
```

Opción B — Usar `.htaccess` para redirect (si el hosting lo permite):
```apache
# En la raíz .htaccess o en public/.htaccess
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/public/ [NC]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ /public%{REQUEST_URI} [L,R=301]
```

Opción C — Usar `index.php` en la raíz que incluye el `public/`:
```apache
# En la raíz .htaccess (ACTUAL - requiere ajustar rutas)
Options -Indexes
<FilesMatch "\.(sql|md|ini|env|bak|zip|log|private|db|git|htaccess)$">
    Require all denied
</FilesMatch>
# ... resto de reglas
```

---

## 3. HTTPS y SSL

- [ ] En hPanel → **SSL**, solicita un certificado gratuito (Let's Encrypt) para tu dominio.
- [ ] Verifica que `https://tusitio.com` funcione y redirija desde HTTP.
- [ ] Añade redirección en `.htaccess`:
  ```apache
  RewriteEngine On
  RewriteCond %{HTTPS} off [OR]
  RewriteCond %{HTTP_HOST} ^www\.tusitio\.com [NC]
  RewriteRule ^ https://tusitio.com%{REQUEST_URI} [L,R=301]
  ```
- [ ] **Cookies Secure**: En `config.php` (bootstrap.php), ya tienes:
  ```php
  'secure' => $isHttps,
  ```
  Asegúrate de que el sitio siempre trabaje sobre HTTPS en producción.
- [ ] **HSTS** (opcional pero recomendado):
  ```apache
  Header set Strict-Transport-Security "max-age=31536000; includeSubDomains" env=HTTPS
  ```
- [ ] **Cabeceras de seguridad** — Ya aplicadas en `bootstrap.php`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - `Cache-Control: private, no-store`

---

## 4. Configuración de la Base de Datos

- [ ] **MySQL sin exposición pública**: 
  - La base de datos no debe estar accesible desde internet.
  - En hPanel → **Databases**, verifica que el host sea `127.0.0.1` o la IP interna indicada.
- [ ] **Privilegios mínimos**: El usuario de la aplicación (`owenpusey` por defecto) debe tener solo:
  - `SELECT`, `INSERT`, `UPDATE`, `DELETE` sobre sus tablas.
  - `CREATE`, `DROP` **no** deben estar concedidos.
  - En hPanel → **MySQL Databases** → privilegios, revisa y ajusta si es necesario.
- [ ] **Credenciales seguras**:
  - `.env` debe contener `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
  - Nunca commits `.env` al repositorio (ya está en `.gitignore`).
  - En Hostinger, las credenciales se ven en hPanel → **Databases** → **MySQL Administrar** → **Informaciones de conexión**.
- [ ] **Conexión protegida**:
  - Siempre `PDO ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION`.
  - `charset=utf8mb4` en el DSN.
  - No uses `192.168.x.x` o IPs locales en producción a menos que se sepa lo que haces.

---

## 5. Respaldos Cifrados

- [ ] Los scripts de backup (`scripts/backup-database.ps1`) generan `.sql.enc` cifrados con OpenSSL AES-256-GCM.
- [ ] Los archivos de respaldo se guardan en `storage/backups/` (ignorado por `.gitignore`).
- [ ] Configura una tarea programada (cron en Hostinger o script propio) para ejecuciones automáticas.
- [ ] **Retención**: El script elimina backups mayores a 30 días (configurable con `-RetentionDays`).
- [ ] **Logging**: Las operaciones se registran en `logs/backup.log`.
- [ ] **Probar restauración** periódicamente en un entorno de testing (usar `scripts/setup-test-db.ps1` con `-TestDb hotel_lockers_test`).

---

## 6. Restricción de Acceso

Evalúa qué opciones son reales para tu plan:

- [ ] **IP allowadas**: En hPanel → **Security** → **IP Restriction**, puedes limitar el acceso a la UI solo a las IPs del hotel.
  - *Si el plan lo permite*: añade la IP de los computadores compartidos del hotel.
  - *Si no está disponible*: esta capa no es crítica si ya hay login + HTTPS + CSP.
- [ ] **Firewall**: Hostinger Planos más altos incluyen firewall. Verifica en hPanel → **Security**.
- [ ] **VPN**: Si el personal accede desde fuera del hotel, considera una VPN empresarial o Cloudflare Access.
- [ ] **Protección administrativa**: El usuario admin ya requiere rol `administrador` en MySQL. No compartas credenciales de admin.

**Validación crítica**: 
Antes de considerar la aplicación "solo para la red del hotel", pruébalo desde una conexión externa (por ejemplo, desde tu celular usando datos móviles, no Wi-Fi del hotel). Verifica que:
- El login funcione correctamente.
- Las operaciones requieran sesión válida.
- No se filtren datos sensibles en URLs o respuestas.

---

## 7. Configuración de Produ

### Variables de Entorno (.env)

Crea `.env` en la raíz del proyecto (NUNCA commitees esto):

```env
DB_HOST=127.0.0.1
DB_NAME=sirenis_locker_db
DB_USER=tu_usuario_app
DB_PASSWORD=tu_contraseña_segurosa
DB_PORT=3306
TIME_ZONE=America/Bogota

# Configuración de aplicación
APP_URL=https://tusitio.com
APP_ENV=production

# Configuración de backup (opcional)
BACKUP_RETENTION_DAYS=30
BACKUP_OPENSSL_PWD=tu_pwd_openssl_opcional
```

### Permisos de Archivos

```bash
# En la raíz del proyecto (puedes usar SSH o File Manager con chmod)
chmod 644 *.php, *.css, *.js, *.html, .htaccess
chmod 755 assets/fonts/, assets/image/
chmod 755 scripts/
chmod 600 .env   # Solo el propietario puede leer
```

### Configuración PHP

En hPanel → **PHP Settings** (o `.user.ini`):

- `display_errors = Off` (nunca en producción)
- `error_log = /ruta/privada/errores.log`
- `upload_max_filesize = 50M` (ajusta según necesidad)
- `post_max_size = 50M`
- `max_execution_time = 60`
- `max_input_time = 60`

**Ruta de error log privada**: En Hostinger, una ruta segura podría ser:
`/home/username/error_log` o `/var/log/httpd/error_log` — pregunta en soporte si no estás seguro.

### Logs Privados

- [ ] Asegúrate de que los logs de PHP y Apache no contengan rutas absolutas ni datos de usuarios.
- [ ] En `bootstrap.php` ya tienes `ini_set('display_errors', '0');`.
- [ ] Los errores van a `error_log()` que en producción debe ir a archivo, no a pantalla.

### Protección de Directorios

- [ ] `.htaccess` ya bloquea por extensión: `.sql`, `.md`, `.ini`, `.env`, `.bak`, `.zip`, `.log`, `.private`, `.db`, `.git`, `.htaccess`.
- [ ] `Options -Indexes` para evitar enumeración de directorios.
- [ ] Probar acceder a `tusitio.com/storage/` y que den 403.

### Procedimiento de Actualización

1. Hacer backup completo (archivos + base de datos cifrada).
2. Subir nuevos archivos por FTP/SFTP o hPanel File Manager.
3. Ejecutar `scripts/setup-test-db.ps1` con `-TestDb` para verificar compatibilidad.
4. Probar en staging (si tienes copia de testing).
5. Actualizar `.env` si cambian las variables de entorno.
6. Verificar que `npm run test:static` pase (11 PHP + 5 JS, 0 fallos).
7. Comprobar que las cabeceras de seguridad siguen presentes.

---

## 8. Checklist Final antes de Dar de Alta

- [ ] Dominio apuntado correctamente a Hostinger (DNS).
- [ ] SSL activo y redirección HTTP→HTTPS configurada.
- [ ] `public_html` o DocumentRoot apunta a la carpeta `public/`.
- [ ] `.htaccess` protege directorios `private/`, `db/`, `scripts/`, `storage/`.
- [ ] `.env` existe con credenciales reales (no versionado).
- [ ] Usuario de BD tiene privilegios mínimos (SELECT/INSERT/UPDATE/DELETE solo).
- [ ] No hay archivos `.sql` reales ni `.env` en el repositorio Git.
- [ ] Las cabeceras de seguridad se ven en https://headers.testing.google.com o extensiones similares.
- [ ] Prueba de login desde conexión externa (datos móviles) funciona.
- [ ] La desactivación de usuario y cambio de contraseña funcionan como se espera.
- [ ] Se conoce el procedimiento de rollback si algo falla después del despliegue.

---

## 9. Qué NO Hacer (Prohibiciones)

- [ ] No comites `.env` ni archivos con credenciales en Git.
- [ ] No dejes `setup.php` accesible en producción (bórralo o protégelo con `.htaccess`).
- [ ] No uses `DB_HOST=localhost` si tu hosting usa IP diferente; usa el valor que indique hPanel.
- [ ] No des privilegios `CREATE/DROP` al usuario de la aplicación en producción.
- [ ] No desactives `Options -Indexes` si quieres prevenir enumeración.
- [ ] No ignores los warnings de `npm run test:static`.

---

## 10. Próximos Pasos Después de este Checklist

1. Desplegar siguiendo este checklist paso a paso.
2. Monitorear los logs los primeros 7 días.
3. Programar el primer backup automatizado.
4. Verificar renovación automática del certificado SSL (Let's Encrypt en Hostinger suele renovarse cada 90 días automáticamente).
5. Agendar revisión de seguridad cada 3 meses.

---
*Este documento es parte de la Fase 7 del proyecto Grand Sirenis Locker App. 
No modificar infraestructura sin autorización. Probar en entorno de staging antes de producción.*