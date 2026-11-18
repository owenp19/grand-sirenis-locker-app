# 🔐 LockerFlow · PWA local para gestionar lockers del hotel

**Proyecto completo:** PHP 8.1+, MySQL 8 / MariaDB 10.4+, JavaScript, CSS y PWA, sin Laravel ni frameworks pesados. Incluye un **dashboard responsive con gráficos**, 156 lockers originales, gestión de estados y movimientos; ahora con **pantallas de inicio de sesión y registro** integradas.

## 1. Primera instalación

1. Descomprime el ZIP y abre la carpeta **`Lockers_Hotel_PWA`** con VS Code. Puedes copiarla en `C:\xampp\htdocs\Lockers_Hotel_PWA`, pero **no es obligatorio usar Apache de XAMPP** si inicias PHP con el servidor integrado.
2. Necesitas **PHP con la extensión `pdo_mysql` activa** y un servidor **MySQL/MariaDB encendido**. XAMPP sirve para administrar MySQL. Para comprobar PHP en la terminal: `php -v` y `php -m` (debe aparecer `pdo_mysql`).
3. En phpMyAdmin, abre **Importar** y ejecuta **`db/schema.sql`**; después selecciona la base **`hotel_lockers`** e importa **`db/seed.sql`**. Los 156 lockers originales se cargan **solo en una instalación nueva**.
4. Comprueba la conexión en **`private/config.php`** (por defecto MySQL local, base `hotel_lockers`, usuario `root` sin contraseña, como en algunas instalaciones de XAMPP). No compartas esa contraseña y establece una para tu servidor si la instalación lo permite.
5. Abre una terminal en VS Code **desde la raíz `Lockers_Hotel_PWA`** y ejecuta:

   ```powershell
   php -S 127.0.0.1:8000 -t public
   ```

   Si Windows no reconoce `php` y tienes XAMPP:

   ```powershell
   & "C:\xampp\php\php.exe" -S 127.0.0.1:8000 -t public
   ```

   También puedes ejecutar **`iniciar-servidor.bat`** en Windows o usar **Terminal → Ejecutar tarea → LockerFlow: iniciar PHP** (atajo `Ctrl + Shift + B`) desde VS Code. El archivo `.vscode/tasks.json` viene preparado.
6. Abre **http://localhost:8000/register.php** o **http://127.0.0.1:8000/register.php** desde el mismo equipo. El **primer registro** crea automáticamente al **administrador principal** y luego abre el dashboard.
7. Para futuros accesos, abre **http://localhost:8000/login.php**. En Chrome/Edge sobre localhost, el navegador puede ofrecer **Instalar LockerFlow** como PWA.

> ⚠️ PHP y MySQL son servicios separados. El comando `php -S` solo inicia PHP: necesitas mantener MySQL activo. No abras los archivos `.php` con doble clic.

### Si ya tenías LockerFlow instalado

**No importes `seed.sql` otra vez y no borres la base existente.** Antes de cualquier actualización, exporta un respaldo SQL desde phpMyAdmin.

1. Conserva la base **`hotel_lockers`** con tus registros originales y movimientos.
2. Ejecuta **una sola vez** `db/migrations/001_roles_usuarios.sql` desde la pestaña **Importar** de phpMyAdmin. Solo añade la columna `role` a `users` y conserva usuarios, claves, lockers e historial.
3. Sustituye el **código del proyecto** por la versión nueva, conservando tus parámetros reales de acceso a MySQL en `private/config.php`.
4. Inicia PHP de nuevo y entra con **tu usuario y contraseña de siempre** en `/login.php`. Los usuarios existentes reciben el rol **Administrador** por compatibilidad (antes no había roles).
5. Si la migración indica `Duplicate column name 'role'`, significa que ya se había ejecutado: **no la repitas**.

> Para una instalación nueva utiliza `schema.sql` (incluye roles desde el principio); **no** ejecutes también la migración. No sobrescribas tu configuración ni tu base sin respaldo.

## 2. Inicio de sesión y registro

- **`public/login.php`**: formulario responsive, mostrar/ocultar contraseña, validación, token CSRF, mensaje de error y bloqueo temporal de intentos por sesión. Las contraseñas se verifican por hash con `password_verify`.
- **`public/register.php`**: nombre completo, usuario único, contraseña de mínimo 12 caracteres, confirmación, mostrar/ocultar y rol del personal. Las claves se almacenan con `password_hash`, nunca en texto claro.
- **Registro inicial:** solo cuando **no hay usuarios** y el navegador se conecta desde **el mismo equipo servidor** (`localhost`). Crea la primera cuenta Administrador y comienza sesión.
- **Registro posterior:** **no es público**; un Administrador autenticado puede ingresar a **＋ Crear usuario** en el menú lateral (o encabezado móvil) y dar de alta cuentas adicionales. Un Operador no puede crear usuarios.
- **Roles:** Administrador crea cuentas y administra lockers; Operador administra lockers, consulta gráficos y movimientos, pero no crea cuentas. La app es para un entorno local privado, no para publicación abierta en internet.
- **Ruta anterior `/setup.php`**: redirige a `/register.php` para centralizar la creación de cuentas. **`/logout.php`** cierra sesión mediante POST protegido con CSRF.

**No hay registro libre desde internet**: el enlace «Crear cuenta» del login explica la restricción si ya existe un administrador. Esto evita cuentas sin autorización que puedan ver nombres de colaboradores y movimientos.

## 3. Funciones del sistema

| Sección | Función |
| --- | --- |
| Dashboard | Estadísticas y gráficos de ocupación por estado y por bloque, alimentados por MySQL. |
| Inventario | Ver los 156 lockers originales, filtrar, buscar y administrar estados. |
| Asignación | Asignar un locker disponible con nombre, departamento, jefe y responsable. |
| Liberación | Registrar renuncia o salida, cerrar asignación y dejarlo disponible o marcado por incidencia. |
| Traslado | Cambiar de locker mediante transacción MySQL sin perder los datos del colaborador. |
| Colaboradores | Buscar titulares por nombre, locker y departamento. |
| Movimientos | Bitácora en MySQL de asignaciones y cambios con fecha y usuario responsable. |
| Incidencias | Revisar lockers dañados, sin llave, bloqueados e inconsistencias del Excel. |
| Exportación | Inventario CSV, historial CSV y respaldo JSON de consulta. |
| PWA | Íconos y caché de recursos estáticos. **No cachea páginas de acceso ni datos privados.** |

Los datos heredados de la planilla **no se alteran** por agregar login y registro. No se inventan movimientos anteriores.

## 4. Estructura del proyecto

```text
Lockers_Hotel_PWA/
├── .vscode/tasks.json                 # Ejecutar servidor desde VS Code
├── iniciar-servidor.bat               # Alternativa en Windows
├── README.md
├── db/
│   ├── schema.sql                     # Nueva instalación: users + lockers + movements
│   ├── seed.sql                       # 156 lockers originales (solo instalación nueva)
│   └── migrations/
│       └── 001_roles_usuarios.sql     # Actualización sin pérdida de datos
├── private/
│   ├── config.php                     # Conexión MySQL (no publicar)
│   └── bootstrap.php                  # Autenticación, sesión, CSRF, utilidades PDO
└── public/
    ├── index.php                      # Dashboard
    ├── login.php                      # Iniciar sesión
    ├── register.php                   # Crear cuentas (acceso restringido)
    ├── setup.php                      # Redirige a registro
    ├── logout.php                     # Salir
    ├── api.php                        # CRUD + auditoría + exportaciones
    ├── manifest.webmanifest           # PWA
    ├── sw.js                          # Service worker; caché estática
    ├── offline.html                   # Aviso si el servidor no está disponible
    ├── icons/
    └── assets/
        ├── css/app.css                # UI/UX y tokens del dashboard
        ├── css/auth.css               # Diseño login y registro
        ├── js/app.js                  # Dashboard y gráficos
        └── js/auth.js                 # Mostrar clave y validación en registro
```

## 5. Seguridad, funcionamiento local y copias de seguridad

- Conexión MySQL por PDO y consultas parametrizadas; contraseñas con hashes; sesión `HttpOnly`/`SameSite`, regeneración de identificador, token CSRF, encabezados de seguridad y registro del actor de los cambios.
- El primer registro solo está permitido desde el equipo servidor; los nuevos usuarios solo pueden crearlos administradores. Si quieres habilitar acceso desde más dispositivos en red, configura HTTPS y políticas de red y seguridad antes de hacerlo.
- **No expongas PHP o MySQL directamente a internet**. El servidor `php -S` es únicamente de desarrollo local. Tampoco expongas `db/`, `private/` ni respaldos SQL.
- La PWA es instalable si el navegador y el origen son compatibles. **No permite asignar ni consultar lockers sin PHP/MySQL disponibles**. No usa una base de datos offline paralela.
- **El bloqueo de lockers es administrativo**, no controla cerraduras físicas.
- Antes de actualizar o reinstalar, exporta desde phpMyAdmin **hotel_lockers → Exportar → SQL**. **`seed.sql` no es un respaldo de tus movimientos.**
- No se ha verificado esta entrega contra un servidor MySQL activo en el entorno de creación; comprueba login, roles y consultas desde tu instalación local. Todas las páginas PHP se pueden verificar con `php -l`.
