# Guía de despliegue — Grand Sirenis Locker App

Esta app fue diseñada para uso **local o intranet privada**. El despliegue recomendado es un host interno (VPS o servidor del hotel) con HTTPS y acceso restringido. **No se recomienda publicarla en internet abierto** sin una revisión adicional de exposición, porque el alta de la primera cuenta y el registro están limitados a `localhost`.

## 0. Requisitos previos

| Componente | Versión mínima | Verificación |
| --- | --- | --- |
| PHP | 8.2 | `php -v` |
| Extensiones PHP | `pdo_mysql`, `mbstring`, `json` | `php -m` |
| MariaDB / MySQL | 10.4 / 8.0 | `mysql --version` |
| Apache | 2.4 con `mod_headers` | `apache2ctl -M` |
| HTTPS | Obligatorio para PWA y cookies `Secure` | `curl -I https://…` |

Estructura importante:

```text
/provar/www/grand-sirenis-locker-app/
├── .env              ← secreto, nunca dentro de public/ ni en Git
├── db/               ← SQL, fuera de public/
├── private/          ← bootstrap, config y lógica, fuera de public/
└── public/           ← DocumentRoot (ÚNICO directorio servible)
```

---

## 1. Subir el código y fijar DocumentRoot

Copia el repositorio al servidor (sin `node_modules`, sin `.env`):

```bash
sudo mkdir -p /var/www/grand-sirenis-locker-app
sudo chown -R www-data:www-data /var/www/grand-sirenis-locker-app
git clone https://github.com/owenp19/grand-sirenis-locker-app.git /var/www/grand-sirenis-locker-app
```

VirtualHost de ejemplo:

```apache
<VirtualHost *:80>
    ServerName lockers.interno.ejemplo
    DocumentRoot /var/www/grand-sirenis-locker-app/public

    <Directory /var/www/grand-sirenis-locker-app/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/lockers-error.log
    CustomLog ${APACHE_LOG_DIR}/lockers-access.log combined
</VirtualHost>
```

Puntos obligatorios:

- `DocumentRoot` debe apuntar a `public/`, **nunca a la raíz del proyecto**.
- `private/` y `db/` quedan así fuera de la web; sus `.htaccess` con `Require all denied` son una segunda barrera.
- No hace falta `mod_rewrite`: la app usa rutas por hash (`#settings`, `#profile`).
- Activa HTTPS con Let's Encrypt o el certificado interno antes de dar acceso a usuarios.

---

## 2. Crear `.env` con credenciales reales

```bash
cd /var/www/grand-sirenis-locker-app
cp .env.example .env
chmod 640 .env
chown root:www-data .env
```

Contenido de `.env` (valores de ejemplo):

```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sirenis_locker_db
DB_USER=app_lockers
DB_PASSWORD=REEMPLAZAR_CON_CLAVE_SEGURA
TIME_ZONE=America/Bogota
```

Reglas:

- `.env` está en `.gitignore`: **nunca subirlo a GitHub**.
- Usar un usuario de BD con privilegios mínimos, nunca `root`.
- `config.php` lee este archivo; si falta, caerá a valores por defecto. En el host verifica que `.env` exista antes de dar por terminado el despliegue.
- Si Apache/PHP y MySQL están en contenedores distintos, `DB_HOST` debe ser el nombre del servicio, no `127.0.0.1`.

---

## 3. Base de datos: esquema y migraciones

### 3.1 Respaldo previo (obligatorio en instalaciones con datos)

```bash
mysqldump -h 127.0.0.1 -u root -p sirenis_locker_db > backup_$(date +%Y%m%d_%H%M).sql
```

### 3.2 Base nueva

`db/schema.sql` **ya incluye** el rol, la unicidad `block_no + locker_no`, los índices y las columnas actuales. Por tanto, en una base nueva:

```bash
mysql -h 127.0.0.1 -u root -p < db/schema.sql
```

Después aplica solo las migraciones que añaden protecciones (las primeras tres son para bases antiguas):

```bash
mysql -h 127.0.0.1 -u root -p sirenis_locker_db < db/migrations/004_proteccion_movimientos.sql
mysql -h 127.0.0.1 -u root -p sirenis_locker_db < db/migrations/006_integridad_estado_titular.sql
```

### 3.3 Base existente (instalación antigua)

Aplicar en orden, desde la raíz del proyecto:

```bash
mysql -h 127.0.0.1 -u root -p sirenis_locker_db < db/migrations/001_roles_usuarios.sql
mysql -h 127.0.0.1 -u root -p sirenis_locker_db < db/migrations/002_schema_hardening.sql
mysql -h 127.0.0.1 -u root -p sirenis_locker_db < db/migrations/003_rol_predeterminado_operador.sql
mysql -h 127.0.0.1 -u root -p sirenis_locker_db < db/migrations/004_proteccion_movimientos.sql
mysql -h 127.0.0.1 -u root -p sirenis_locker_db < db/migrations/006_integridad_estado_titular.sql
```

Antes de la `006`, comprobar que no hay datos incoherentes:

```sql
SELECT COUNT(*) FROM lockers WHERE status='Asignado' AND TRIM(COALESCE(person_name,''))='';
SELECT COUNT(*) FROM lockers WHERE status='Disponible' AND TRIM(COALESCE(person_name,''))<>'';
```

Ambas deben devolver `0`.

### 3.4 Privilegios mínimos (opcional, con root)

`db/migrations/005_privilegios_minimos.sql` quita `DELETE` al usuario de la app. Requiere cuenta administrativa y **no debe ejecutarse con el usuario de aplicación**. Ajustar el host (`'localhost'` / `'127.0.0.1'` / `'%'`) según `SHOW GRANTS`.

### 3.5 Permisos de escritura de la app

La app usa `private/runtime/` para el limitador de intentos de login:

```bash
mkdir -p private/runtime
chown -R www-data:www-data private/runtime
chmod 700 private/runtime
```

Si el directorio no es escribible, el limitador funciona en modo fail-open (no bloquea); conviene corregirlo.

---

## 4. Crear el administrador inicial

La primera cuenta solo se puede crear desde la propia máquina servidora: `register.php` exige IP `127.0.0.1` o `::1`.

### Opción A — desde el navegador del servidor

1. Abrir `http://127.0.0.1/register.php` en el servidor.
2. No hay usuarios: el formulario crea la primera cuenta con rol **Administrador**.
3. Usar contraseña de al menos 12 caracteres.
4. Cerrar la pestaña al terminar.

### Opción B — desde shell del servidor (sin navegador)

```bash
cd /var/www/grand-sirenis-locker-app
php -r '
  require "private/bootstrap.php";
  $pass = trim(fgets(STDIN));
  if (strlen($pass) < 12) { fwrite(STDERR, "Mínimo 12 caracteres\n"); exit(1); }
  $hash = password_hash($pass, PASSWORD_DEFAULT);
  $db = db();
  $n = (int) $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
  if ($n > 0) { fwrite(STDERR, "Ya existen usuarios\n"); exit(1); }
  $db->prepare("INSERT INTO users (username, display_name, password_hash, role) VALUES (?,?,?,?)")
     ->execute(["admin", "Administrador", $hash, "administrador"]);
  echo "Administrador creado\n";
'
```

El script pide la contraseña por stdin (no queda en el historial). Después de crear al administrador, el registro público queda cerrado por diseño.

---

## 5. Verificar HTTPS y cabeceras

Tras activar el certificado:

```bash
curl -I https://lockers.interno.ejemplo/index.php
```

Debe incluir, como mínimo:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; …
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Cache-Control: private, no-store
Set-Cookie: LOCKERS_HOTEL_SESSION=…; Secure; HttpOnly; SameSite=Lax
```

Comprobaciones adicionales:

- `https://…/private/config.php` debe dar **403/404**, nunca mostrar código PHP.
- `https://…/db/schema.sql` debe dar **403/404**.
- Si termina TLS en un proxy/balanceador, `bootstrap.php` debe recibir `$_SERVER['HTTPS'] = 'on'`; si no, la cookie no se marcará `Secure`. Ajustar la configuración del proxy o del PHP-FPM.
- La zona horaria de MySQL debe coincidir con `TIME_ZONE` del `.env` (`bootstrap.php` fija `-05:00` en la sesión).

---

## 6. Pruebas E2E antes de dar acceso

Las pruebas modifican datos: **ejecutarlas contra una base de copia o un entorno de staging**, nunca contra la base de producción.

Desde una estación con Node 18+ y Chrome/Edge instalado:

```bash
npm ci
npm run test:static
PLAYWRIGHT_BASE_URL=https://lockers.interno.ejemplo npm run test:e2e
```

Si no hay Chrome/Edge, indicar el ejecutable:

```bash
PLAYWRIGHT_CHROME_EXECUTABLE_PATH=/usr/bin/chromium PLAYWRIGHT_BASE_URL=https://… npm run test:e2e
```

Para un entorno aislado local (base `hotel_lockers_test`, puerto 8001):

```bash
npm run test:e2e:isolated
```

Criterio de aceptación: `npm run test:static` en verde, 0 `pageErrors`, 0 peticiones fallidas y los tres specs (`app`, `auth`, `identity-verify`) en verde.

---

## 7. Verificación final en el navegador

1. `login.php`: iniciar sesión con el administrador.
2. Dashboard: cargan los 156 lockers y el indicador de servidor dice “Conectado al servidor”.
3. `#profile`: cambiar el nombre y guardar; debe reflejarse en la topbar sin recargar.
4. `#settings`: crear un borrador de “Estado físico”, sincronizar con el servidor y confirmar el resultado mostrado.
5. Consola del navegador: **0 errores de CSP** y 0 errores `ReferenceError`.
6. PWA: instalar la app y comprobar que `offline.html` aparece al cortar el servidor (la API nunca se sirve desde caché).

---

## 8. Rollback

- **Cambio de código**: `git checkout <commit-anterior>` y recargar; no afecta a la BD.
- **Triggers 004/006**:

```sql
DROP TRIGGER IF EXISTS trg_movements_block_update;
DROP TRIGGER IF EXISTS trg_movements_block_delete;
DROP TRIGGER IF EXISTS trg_lockers_coherence_insert;
DROP TRIGGER IF EXISTS trg_lockers_coherence_update;
```

- **Restauración completa**:

```bash
mysql -h 127.0.0.1 -u root -p sirenis_locker_db < backup_YYYYMMDD_HHMM.sql
```

- **Perfil**: si se usó la opción B, borrar solo esa cuenta con `DELETE FROM users WHERE username='admin'` antes de volver a crearla.

---

## 9. Checklist de cierre

- [ ] `DocumentRoot` apunta a `public/`.
- [ ] `.env` presente, fuera de `public/` y fuera de Git.
- [ ] Usuario de BD con privilegios mínimos y contraseña real.
- [ ] Esquema + migraciones aplicadas en el orden correcto.
- [ ] `private/runtime/` escribible por `www-data`.
- [ ] Administrador creado desde `localhost`.
- [ ] HTTPS con HSTS y cookie `Secure; HttpOnly; SameSite=Lax`.
- [ ] `private/` y `db/` devuelven 403/404.
- [ ] `npm run test:static` y E2E en staging en verde.
- [ ] Verificación visual de dashboard, perfil, configuración y PWA.
