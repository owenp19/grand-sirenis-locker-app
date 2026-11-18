# 📋 DIAGNÓSTICO TÉCNICO — Grand Sirenis Locker App

**Fecha:** 17 de noviembre de 2026  
**Auditoría:** Fase 1 — Inspección del repositorio (sin cambios funcionales)  
**Estado:** Proyecto existente, operativo en entorno local, sin inicializar como repositorio Git

---

## 1. Identidad del proyecto

- Nombre público del README: **LockerFlow · PWA local para gestionar lockers del hotel**
- Nombre oficial del proyecto (instrucción): **Grand Sirenis Locker App**
- Carpeta raíz: `C:\Users\Owen\Documents\Sueños\software-apps\Grand-Sirenis-Loker-app`
- Descripción: aplicación local PHP + MySQL para gestión de lockers de colaboradores de hotel, con dashboard, inventario, asignaciones, movimientos, roles de usuario y PWA instalable.

---

## 2. Versiones del entorno (verificadas)

| Herramienta | Versión | Observación |
|---|---|---|
| Sistema operativo | Windows 10 build 26100 (x64) | nativo, sin WSL asumido |
| PHP | 8.2.12 (CLI, ZTS, VC++ 2019 x64) | Extensiones `pdo_mysql`, `mysqli`, `session` presentes |
| Base de datos | MariaDB 10.4.32 (XAMPP, `C:\xampp\mysql`) | Puerto 3306 |
| Node.js | v26.13.0 | npm 11.19.1 |
| Git | 2.54.0.windows.1 | No hay repositorio `.git` inicializado |
| Servidor web | PHP integrado (`php -S 127.0.0.1:8000 -t public`) | XAMPP opcional para MySQL |

---

## 3. Inventario de archivos existentes

### Raíz
| Archivo | Función |
|---|---|
| `README.md` | Documentación de instalación y uso (referencia a carpeta `Lockers_Hotel_PWA`) |
| `iniciar-servidor.bat` | Script Windows para iniciar PHP integrado en puerto 8000 |
| `.htaccess` | Deniega descarga de `.sql`, `.md`, `.ini`, `.env`, `.bak`, `.zip` (solo aplica con Apache) |
| `.vscode/tasks.json` | Tarea VS Code "LockerFlow: iniciar PHP" (`Ctrl + Shift + B`) |

### Base de datos (`db/`)
| Archivo | Función |
|---|---|
| `schema.sql` | Crea BD `hotel_lockers` y tablas `users`, `lockers`, `movements` |
| `seed.sql` | 156 lockers originales importados de Excel (valores codificados en hex `CONVERT(0x...)`) |
| `migrations/001_roles_usuarios.sql` | Añade columna `role` a `users` sin borrar datos |

### Código interno (`private/`)
| Archivo | Función |
|---|---|
| `config.php` | Configuración de conexión MySQL (host `127.0.0.1`, puerto `3306`, BD `hotel_lockers`, usuario `root`, contraseña vacía, zona `America/Bogota`) |
| `bootstrap.php` | Inicia sesión segura, constante de conexión PDO (consultas preparadas, `EMULATE_PREPARES => false`), helpers `csrf_token`, `current_user`, `require_login`, `respond`, `fail`, `field`, `valid_date`, `safe_user_agent`, cabeceras de seguridad (CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cache-Control`) |

### Código público (`public/`)
| Archivo | Función |
|---|---|
| `index.php` | Dashboard (requiere login), navegación lateral, carga dinámica de vistas mediante JS |
| `login.php` | Formulario de login con CSRF, bloqueo de intentos (8 por sesión, reset cada 15 min), `password_verify` |
| `register.php` | Registro restringido: primera cuenta solo desde `localhost`; posteriores solo por administrador autenticado |
| `logout.php` | Cierre de sesión vía POST con validación CSRF |
| `setup.php` | Redirección (302) a `register.php` |
| `api.php` | Endpoint único CRUD + auditoría + exportaciones (recurso `bootstrap`, `export`, acciones `assign`, `release`, `transfer`, `status`, `edit`, `reconcile`) con transacciones y `FOR UPDATE` |
| `manifest.webmanifest` | PWA: nombre `LockerFlow | Gestión Hotelera`, `short_name` `LockerFlow`, íconos 192/512, `display: standalone` |
| `sw.js` | Service Worker `lockerflow-shell-v2`: caché estática de assets; excluye API y rutas de autenticación |
| `offline.html` | Página de aviso sin conexión |
| `icons/icon.svg`, `icon-192.png`, `icon-512.png` | Íconos PWA |
| `assets/js/app.js` | Lógica del dashboard: renderizado, filtros, paginación, modales, gráficos SVG, exportaciones, PWA install prompt |
| `assets/js/auth.js` | Mostrar/ocultar contraseña y comparación de confirmación en formularios de auth |
| `assets/css/app.css` | Variables CSS, diseño dashboard, sidebar, tablas, modales, estadísticas, responsive |
| `assets/css/auth.css` | Diseño login y registro (auth-v2) |

---

## 4. Punto de entrada y flujo de navegación

- Punto de entrada principal: `public/index.php` (dashboard, requiere sesión).
- Rutas públicas: `login.php`, `register.php`, `setup.php` (redirige).
- Ruta de acción: `api.php?resource=<recurso>&...` (POST con JSON y token CSRF en header `X-CSRF-Token`).
- Servidor: `php -S 127.0.0.1:8000 -t public` (sirve solo `public/`, no expone `private/` ni `db/`).

---

## 5. Conexión PHP ↔ MySQL

- `private/bootstrap.php` → función `db()`: PDO singleton, DSN `mysql:host=127.0.0.1;port=3306;dbname=hotel_lockers;charset=utf8mb4`, `PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION`, `PDO::ATTR_EMULATE_PREPARES => false`, `SET time_zone = '-05:00'`.
- Todas las consultas en `api.php` usan sentencias preparadas (`prepare`/`execute`).
- `config.php` contiene credenciales en texto plano (`root` / contraseña vacía) — riesgo si se expone la carpeta `private/`.

---

## 6. Módulos y funcionalidades disponibles

| Módulo | Pantallas / Acciones |
|---|---|
| Autenticación | Login, registro (restringido), logout, primera cuenta de administrador |
| Dashboard | Estadísticas (total, asignados, disponibles, requieren atención), gráfico donut, ocupación por bloque, acciones rápidas, movimientos recientes |
| Inventario | Tabla de lockers con filtros por estado, bloque y búsqueda; paginación (16 por página) |
| Colaboradores | Lista de titulares asignados con departamento, jefe y locker |
| Movimientos | Bitácora de acciones con fecha y responsable; búsqueda y paginación (45 por página) |
| Incidencias | Detección automática de inconsistencias (duplicados, titulares en disponibles, fechas no validadas, etc.) |
| Asignación / Liberación / Traslado / Estado / Edición / Validación | Modales con validación, transacción MySQL y registro de movimiento con snapshots `JSON` |
| Exportación | CSV inventario, CSV historial, JSON respaldo |
| PWA | Instalable, caché estática, aviso offline, sin caché de datos privados |

---

## 7. Sistema de login y registro (análisis)

**Fortalezas:**
- `password_hash` / `password_verify` (contraseñas nunca en texto claro).
- Mínimo 12 caracteres de contraseña.
- CSRF token en formularios y en header para API.
- `session_regenerate_id(true)` al login y logout.
- Cookies de sesión `HttpOnly`, `SameSite=Lax`, `secure` sobre HTTPS.
- Bloqueo temporal: 8 intentos por sesión, ventana de 15 min.
- Primera cuenta solo desde `127.0.0.1` / `::1` (`safe_user_agent`), con `GET_LOCK` para evitar doble administrador inicial.
- Roles: `administrador` (crea usuarios y gestiona lockers) y `operador` (gestiona lockers, consulta gráficos y movimientos).

**Debilidades / riesgos:**
- `config.php` expone usuario `root` y contraseña vacía por defecto (entorno XAMPP común, pero inseguro si se publica).
- `private/config.php` no está listado en `.htaccess` (solo bloquea extensiones específicas; `.php` no está bloqueado). Con `php -S` y `-t public` no se expone, pero con Apache sí podría leerse si se configura mal.

---

## 8. Implementación PWA

| Elemento | Estado |
|---|---|
| `manifest.webmanifest` | Presente. Nombre `LockerFlow | Gestión Hotelera`, `short_name` `LockerFlow`, `display: standalone`, íconos 192/512, `lang: es-CO` |
| `sw.js` | Presente (v2). Cachea solo assets estáticos; excluye `/api.php`, `/login.php`, `/register.php`, `/setup.php`, `/logout.php`; navegación con `no-store` y fallback a `offline.html` |
| `offline.html` | Presente |
| Íconos | `icon.svg`, `icon-192.png`, `icon-512.png` |
| Comportamiento | No sincronización offline; sin base de datos paralela; datos siempre desde PHP/MySQL |

**Nota:** el nombre público deseado es **Grand Sirenis Locker App**; el manifest aún dice `LockerFlow`.

---

## 9. Estructura de CSS y JavaScript

- `assets/css/app.css`: variables CSS (`--navy`, `--teal`, `--ink`, etc.), diseño desktop-first con media queries (`max-width: 1150px`, `700px`, `420px`, `1400px`). Archivo grande (estilos del dashboard completo en un solo archivo).
- `assets/css/auth.css`: estilos específicos de login/registro (auth-v2), reutiliza variables globales.
- `assets/js/app.js`: ~112 líneas, IIFE, maneja todo el frontend del dashboard (renderizado, modales, exportaciones, PWA).
- `assets/js/auth.js`: ~29 líneas, show/ocultar contraseña y validación de confirmación.

No se detectaron librerías de CSS/JS externas (sin CDN, sin frameworks).

---

## 10. Funciones duplicadas detectadas

- No se detectaron funciones PHP duplicadas entre `bootstrap.php` y `api.php`.
- En `app.js` no hay funciones duplicadas obvias; todo el renderizado vive en un solo módulo IIFE.
- El CSS no muestra duplicación evidente, pero `app.css` agrupa todo el diseño en un solo archivo sin separación por componente.

---

## 11. Problemas de seguridad visibles

| # | Riesgo | Gravedad | Comentario |
|---|---|---|---|
| S1 | Credenciales de MySQL en texto plano en `private/config.php` (`root` / `''`) | Media | Usar variables de entorno o archivo fuera de la raíz pública |
| S2 | `private/` no protegido por `.htaccess` para extensiones `.php` | Media | Con Apache podría servirse `config.php`; con `php -S -t public` no se expone |
| S3 | Sin archivo `.env` ni mecanismo de secretos | Media | Las claves no deben ir en Git |
| S4 | Sin repositorio Git | Baja | Sin historial ni control de versiones |
| S5 | Sin pruebas automatizadas | Media | Sin cobertura de login, API ni PWA |
| S6 | `display_errors = 0` pero errores internos se registran con `error_log` | Baja | Correcto, no expone stack traces al usuario |
| S7 | `api.php` confía en `X-CSRF-Token` del header | Baja | Válido para mismo origen; adecuado para uso local |

---

## 12. Dependencias instaladas

- No hay `composer.json`, `package.json`, ni gestor de dependencias.
- No se usan frameworks ni librerías de terceros (PHP puro, JS vanilla, CSS puro).
- PHP usa extensiones nativas: `pdo`, `pdo_mysql`, `session`, `mysqli`, `mysqlnd`.

---

## 13. Estado de Git

- **No hay repositorio Git inicializado** (`fatal: not a git repository`).
- No hay `.gitignore`.
- No hay historial de commits.

---

## 14. Riesgos principales y recomendaciones iniciales

1. **Inicializar Git** y crear `.gitignore` (excluir `private/config.php` real, respaldos, `storage/`, `vendor/` si aplica).
2. **Mover credenciales** a variables de entorno (`$_ENV` / `getenv`) o `.env` fuera de la raíz pública; nunca commitear `config.php` con contraseñas reales.
3. **Proteger `private/`**: con Apache, denegar acceso a `*.php` dentro de `private/`; con `php -S` seguir sirviendo solo `public/`.
4. **Crear `AGENTS.md` y documentación** (`docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, etc.) para continuidad.
5. **Crear skills** en `.agents/skills/` para UI/UX, frontend, PHP backend, MySQL, ciberseguridad, Playwright, clean code, automatización Windows y memoria persistente.
6. **Configurar Playwright** para pruebas E2E sobre Chromium en localhost:8000.
7. **Crear scripts de automatización Windows** (`scripts/start-dev.ps1`, `check-environment.ps1`, `run-tests.ps1`, `backup-database.ps1`).
8. **Ajustar nombre PWA** a "Grand Sirenis Locker App" en `manifest.webmanifest` (Fase 6).
9. **No ejecutar operaciones destructivas** en la base de datos real sin respaldo (`db/schema.sql` + `db/seed.sql` solo en instalación nueva).

---

## 15. Conclusión de la Fase 1

El proyecto es una aplicación ligera, profesional y funcional sin frameworks pesados. Su arquitectura actual (`public/` expuesto, `private/` interno, `db/` con esquemas, PWA estática) es coherente con el objetivo de mantenerla simple y mantenible. No se realizaron cambios funcionales durante esta auditoría. El siguiente paso es la Fase 2: instalación y creación de skills en `.agents/skills/`.
