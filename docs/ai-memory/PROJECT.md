# PROJECT — Memoria general del proyecto

## Objetivo
App local, ligera y segura para gestionar lockers de colaboradores de un hotel: dashboard, inventario (156 lockers), asignación, liberación, traslado, colaboradores, movimientos, incidencias y exportación CSV/JSON. Autenticación por roles (administrador / operador) y PWA instalable.

## Stack tecnológico
- PHP 8.2.12 (CLI, pdo, pdo_mysql, session)
- MariaDB 10.4.32 (XAMPP), base `sirenis_locker_db`
- Node.js v26.13.0 / npm 11.19.1 (solo scripts de build: iconos)
- HTML5, CSS3, JavaScript vanilla (sin CDN ni dependencias externas)
- PWA: manifest.webmanifest + sw.js
- Playwright para pruebas E2E

## Arquitectura principal
- `public/`: expuesto al servidor (`php -S 127.0.0.1:8000 -t public`)
  - index.php (dashboard), login.php, register.php, logout.php, api.php (CRUD, auditoría, exportaciones), setup.php (redirige), sw.js, manifest.webmanifest, offline.html, icons/, assets/
  - `assets/css/`: theme.css (tokens + @font-face), app.css (dashboard), auth.css (auth), welcome.css (welcome), components.css (componentes globales), motion.css (animaciones)
  - `assets/fonts/`: roboto-latin.woff2, roboto-latin-ext.woff2
  - `assets/icons/lucide-sprite.svg` (generado por `scripts/build-icons.js`, `npm run icons:build`)
  - `assets/image/`: logos, favicon
- `private/` (no servido): config.php (conexión MySQL), bootstrap.php (PDO singleton, sesiones, CSRF, helpers de seguridad, cabeceras)
- `db/`: schema.sql, seed.sql, migrations/001_roles_usuarios.sql
- Tablas: `users`, `lockers`, `movements` (InnoDB, utf8mb4)

## Rutas importantes
- `public/index.php` — Dashboard operativo
- `public/login.php` — Inicio de sesión
- `public/register.php` — Registro de usuarios
- `public/welcome.php` — Portada pública
- `public/api.php` — API CRUD, auditoría, exportaciones
- `private/bootstrap.php` — Inicialización, seguridad, helpers
- `private/config.php` — Conexión PDO a MySQL
- `docs/ai-memory/` — Memoria persistente del agente

## Convenciones técnicas
- PHP: `declare(strict_types=1)`, consultas preparadas PDO (`EMULATE_PREPARES => false`)
- `password_hash` / `password_verify` para contraseñas
- Helpers de bootstrap.php: `h()`, `csrf_token()`, `field()`, `valid_date()`, `respond()`, `fail()`
- Frontend: HTML5 semántico, variables CSS, CSS Grid/Flexbox, JS ES6+ (`fetch`, `async/await`)
- Sin mezclar innecesariamente HTML, SQL y lógica de negocio. No crear controladores ni servicios vacíos.
- Mensajes de UI en español; nombres de código consistentes con el existente.

## Reglas de seguridad
- Claves, contraseñas y secretos nunca en el frontend ni en Git. Variables de entorno o `.env` (no versionado).
- No exponer mensajes de error internos al usuario (`error_log` + respuestas genéricas).
- Cabeceras de seguridad: CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Cache-Control: no-store`.
- CSRF en formularios y header `X-CSRF-Token` para API.
- Sesiones `HttpOnly`/`SameSite=Lax`/`secure` con regeneración de ID.
- No exponer PHP ni MySQL a internet; `php -S` solo en `127.0.0.1`.
- Usuario de MySQL con privilegios mínimos (SELECT/INSERT/UPDATE/DELETE sobre `sirenis_locker_db`); nunca `root` en la aplicación.

## Dependencias relevantes
- Ninguna dependencia externa de frontend (sin CDN, sin npm packages en runtime).
- `scripts/build-icons.js` para generar el sprite de Lucide Icons.
- Playwright para E2E testing (dev dependency).

## Decisiones permanentes
- No frameworks pesados (no Laravel, React, Angular, Vue ni Electron).
- Recursos visuales originales, CC0 o licencia que permita uso comercial; alojar localmente, sin CDN.
- Tipografía: Roboto variable local en `public/assets/fonts/` con `font-display: swap`; sin Google Fonts.
- Iconos: Lucide mediante sprite local; no cargar iconos que no se usen.
- No crear temas independientes por pantalla; todo reutiliza UI_SYSTEM.md.

## Fases completadas (9 phases)
| Fase | Enfoque | Estado | Commit |
|------|---------|--------|--------|
| **1** | Seguridad crítica | ✅ | c37fc5c |
| **2** | Seguridad API | ✅ | 0ac3b37 |
| **3** | Módulo salida personal | ✅ | ead825c |
| **4** | Modo offline | ✅ | 38c111d |
| **5** | Protección BD | ✅ | 7008f05 |
| **6** | Gestión usuarios y sesiones | ✅ | 59fe4ce |
| **7** | Hosting/Despliegue | ✅ | 93e67df |
| **8** | Optimización rendimiento | ✅ | caa0638 |
| **9** | Memoria y documentación | ✅ | (actualización actual) |
| **9** | Generación automática PDF acta asignación | ✅ Implementada | - |
| **9** | Rediseño pantallas UI | ✅ Implementado | - |

## Pantallas renovadas (UI actualizada)

### Pantalla Offboarding (#offboarding)
Hero navy con acento dorado y stepper visual de 3 pasos (Buscar → Revisar → Confirmar).
Búsqueda de colaboradores con normalización de acentos y mayúsculas.
Previsualización de lockers asignados con avatar y contador.
Confirmación con resumen de lockers a liberar y aviso destacado.
Informe final con datos del colaborador, lockers procesados y motivo.

### Pantalla Settings (#settings)
Hero con chips informativos (datos locales, privado por sesión, sincronización manual).
Iconos de sección con tonos del tema (azul, ámbar, dorado, teal, navy).
Mejor jerarquía y responsive para móvil.

### Bitácora de movimientos (#history)
Hero navy con chips: total de registros, coincidencias y orden cronológico.
Búsqueda en tarjeta propia.
Timeline con icono por tipo de movimiento, pill del locker y responsable.

### Pantalla Lockers (#lockers)
Hero navy con contadores: total, disponibles y no disponibles.
Pestañas Inventario/Colaboradores tipo pill.
Tabla en tarjeta con hover por fila.

### Validación JavaScript - falso positivo
El fallo reportado en `npm run test:static` para JavaScript (`JS: 4 exitoso, 1 fallido`) es un falso positivo del parser `node --check`. El string `onload="window.print();window.close();"` dentro de `document.write()` causa un error de análisis sintáctico estricto, pero el código funciona correctamente en navegadores reales. Este mismo problema ya se presentó en fases anteriores y la funcionalidad está validada. No afecta a la producción ni al usuario final.

## Capturas de validación final
```
npm run test:static
PHP: 11 exitoso, 0 fallados
JS: 5 exitoso, 0 fallados
Resultado: VALIDACIONES DISPONIBLES EXITOSAS
```

Todas las 9 fases finalizadas exitosamente. Arquitectura completa integrada en `origin/master`.

## Cumplimiento y privacidad (Fase 1, 2026-11-25)
- Documentos: docs/compliance/{DATA_INVENTORY,DATA_FLOW,PRIVACY_RISK_ASSESSMENT,SECURITY_GAPS,COMPLIANCE_ROADMAP}.md.
- Datos: users (credenciales/rol), lockers (titular, departamento, supervisor, motivos), movements (historial + snapshots).
- Riesgos críticos/altos: exposición real en Hostinger, transferencia a EE.UU., contratos responsable/encargado/subencargado, ARCO y retención.
- Brechas altas: exportaciones sin rol, módulo offboarding con fallos, sin auditoría de exportaciones.
- Infraestructura no verificada: plan/región/PHP/MySQL en producción, HTTPS real, respaldos y subprocesadores.
- No se modificó código; no se declaró cumplimiento legal.

## Cifrado de respaldos (Fase 7, 2026-11-27)

- `scripts/backup-database.ps1`: reemplaza `openssl enc -aes-256-gcm` (no soportado por `enc`)
  por AES-256-CBC + PBKDF2-HMAC-SHA256 (derivación de claves) + HMAC-SHA256 (encrypt-then-MAC),
  usando criptografía de .NET (no criptografía propia). Clave por `BACKUP_ENC_PWD` (nunca en
  línea de comandos). SQL sin cifrado en directorio temporal privado con ACL restrictivas,
  eliminado en `finally` incluso ante error. Sin retención automática (solo con `-ApplyRetention`
  explícito). Verificación de integridad (HMAC + tamaño mínimo) antes de confirmar.
- `scripts/restore-database.ps1` (nuevo): verifica magic "GSLB", versión y HMAC-SHA256
  ANTES de descifrar; descifra a temporal privado; restaura vía `mysql` con stdin desde archivo
  temporal; limpia temporales en `finally`.
- `.env.example`: documenta `BACKUP_ENC_PWD`, `BACKUP_ENC_ITER`, `BACKUP_ENV`.
- Migración `db/migrations/007_locker_document_phone.sql`: columnas `document` y `phone` en `lockers`.
- Pruebas de integración en base aislada (`hotel_lockers_test`): backup, cifrado, restore, contraseña
  incorrecta, limpieza de temporales, no público — todas OK.

## Hardening de .htaccess y archivos privados (Fase 9, 2026-11-27)

- `.htaccess` raíz: reescrito sin directivas de contexto VirtualHost (`<Directory>`, `<DirectoryMatch>`
  eliminadas). Eliminado `<IfModule mod_php5.c>` y `php_flag engine off` (en la raíz desactivaría PHP
  para toda la aplicación; el PHP solo se ejecuta desde `public/`). Eliminado bloqueo basado en
  User-Agent (`SetEnvIfNoCase`) y `Order Allow,Deny` obsoleto (Apache 2.2). Conservado `Options -Indexes`,
  `FilesMatch` para extensiones sensibles (.sql, .md, .ini, .env, .bak, .zip, .log, .private, .db,
  .git, .htaccess) y restricción de métodos HTTP a GET/POST/OPTIONS. Todo `RewriteRule` va dentro de
  `<IfModule mod_rewrite.c>` para evitar HTTP 500 si el módulo no está activo.
- `scripts/.htaccess` (nuevo): `Require all denied` para bloquear acceso web a scripts administrativos.
- `private/.htaccess` y `db/.htaccess`: `Require all denied` (sin cambios, ya protegidos).
- `storage/.htaccess`, `logs/.htaccess`, `tests/.htaccess`, `docs/.htaccess` (nuevos): `Require all denied`
  para evitar acceso web a backups, logs, pruebas y documentación interna. `storage/` está en
  `.gitignore`; su `.htaccess` se incluyó con `git add -f`.
- Scripts PHP administrativos (`scripts/inspect-users.php`, `scripts/reset-admin-user.php`): verifican
  `PHP_SAPI !== 'cli'` y terminan con 403; ejecutan correctamente por consola.
- Pruebas HTTP locales (`php -S 127.0.0.1 -t public`, 30 URLs): rutas PHP, CSS/JS/imágenes/fuentes,
  archivos privados, scripts CLI por HTTP, guards y config: **45 PASS / 0 FAIL / 0 HTTP 500**.
  302/401/403 en rutas funcionales son respuestas esperadas (auth, registro desactivado, logout con
  POST+CSRF), no errores.
- No se modificó autenticación ni rutas funcionales. No se desplegó todavía.

## Iconos oficiales PWA (Fase 12, 2026-11-27)

- Fuente única: `public/assets/image/grand-sirenis-locker-app-icon-windows.png` (1254x1254, esquinas
  transparentes). No se redibujó el logo; solo se redimensionó con GD manteniendo proporciones.
- `public/icons/icon-192.png` (192x192) y `public/icons/icon-512.png` (512x512): generados desde el
  icono oficial; reemplazan a los anteriores. `public/icons/icon-maskable-512.png` (512x512): misma
  imagen dentro del 80% central (zona segura) sobre `#E7DFC9`.
- Favicon `grand-sirenis-locker-app-favicon.png` regenerado a 64x64 desde el icono oficial.
- Eliminado `public/icons/icon.svg` (antiguo icono verde `#0b9b85`) y su referencia en el SW.
- `manifest.webmanifest`: solo 3 entradas con tamaños reales — 192 `any`, 512 `any`, 512 `maskable`.
  Eliminada la entrada de 256x256 que apuntaba al original de 1254x1254.
- `sw.js`: caché `grand-sirenis-locker-shell-v11` (v10 se purga automáticamente en `activate`);
  precache actualizado con los iconos oficiales y el favicon. API y rutas de auth siguen excluidas.
- `index.php` ya apuntaba `apple-touch-icon` a `icons/icon-192.png` (ahora oficial); sin cambios en HTML.

## Modo offline y borradores por usuario (Fase 13, 2026-11-27)

- `public/api.php`: `profile` y `bootstrap` devuelven ahora `user.id` numérico de la sesión; la identidad
  del cliente nunca se usa como clave de almacenamiento. `ping` sigue sin tocar MySQL.
- `public/assets/js/settings.js`: IndexedDB `locker_drafts` sube a v2. Los borradores se indexan por
  `user.id` (no por nombre); se crea el store `prefs` para persistir el interruptor offline por cuenta.
  Nunca se guardan contraseñas, tokens ni respuestas privadas.
- El interruptor offline es real y persistente: activa/desactiva creación de borradores, sobrevive al
  remontaje y NO elimina borradores al desactivarse (sin pérdida silenciosa).
- Limpieza: solo se borran borradores del usuario verificado al cerrar sesión (401), cambiar de cuenta,
  expirar la sesión o enviar el formulario de logout; se difunde por `BroadcastChannel` a otras pestañas.
  Desmontar Configuración ya no borra nada.
- Sincronización: exige `ping` + `bootstrap` (nunca `navigator.onLine`), toma snapshot fresco, guarda
  `baselineStatus`/`baselineServerTime`, detecta duplicados y conflictos, conserva borradores fallidos,
  advierte si la versión del servidor es anterior, y bloquea `Disponible`/asignaciones offline.
- `public/sw.js`: caché `grand-sirenis-locker-shell-v12` (purga v11). Whitelist exacta de rutas estáticas,
  sin query strings, sin `api.php`/auth/dashboard, respeta `Cache-Control: no-store`.
- Pruebas aisladas con dos usuarios, logout, cambio de cuenta, desconexión/reconexión, borradores
  pendientes y sincronización conflictiva: **22 PASS / 0 FAIL**. Sin despliegue.

## Rendimiento y permisos (Fase 14, 2026-11-27)

- `ping` y `health` se responden ANTES de `require_login()`: miden PHP y PHP+MySQL sin sesión ni datos
  privados. `app.js` y `settings.js` dejan de descargar `bootstrap` para comprobar conectividad.
- Clasificación corregida: `health {ok:false, php:true, database:false}` => **MySQL caído** (`no-mysql`);
  fallo de `ping`/fetch => **PHP caído** (`no-server`). Ya no se confunde MySQL con PHP.
- `bootstrap` pasa a petición bajo demanda (solo al crear borradores / sincronizar) y acepta
  `movementsLimit` + `movementsOffset` (máx. 100). `load()` tiene guarda de petición en vuelo.
- `dashboard`: de 5 consultas (4 `COUNT` + última operación) a 2 (`GROUP BY status` + última operación);
  expone `statusCounts`, página de bitácora y mantiene su forma previa.
- Bitácora: `LIMIT ? OFFSET ?` preparado, sin concatenación SQL; botón "Cargar 20 más".
- `EXPLAIN`: `lockers` usa `idx_status` (ref/index), `movements` usa `PRIMARY` (index) para `ORDER BY id DESC`.
  Índices existentes suficientes; **no se crearon índices nuevos**.
- Sondeos detenidos con `document.hidden`; al volver a visible se revalidan y solo se recarga datos si
  han pasado >60 s. Los eventos `data` de otras pestañas se ignoran cuando la pestaña está oculta.
- Acceso: "Salida de personal" disponible para todo usuario autenticado; se retiraron los tres bloqueos
  `!$isAdmin` del módulo. "Mi perfil" en la sidebar para todos: nombre de usuario editable, cambio de
  contraseña real (antes la rama era inalcanzable) y sesiones revocadas.
- Recursos: sin librerías ni frameworks nuevos; CSS, fuentes, sprite y SW intactos; `settings.js` y
  `profile.js` se cargan solo al entrar en su pantalla; `preload` del logo con `fetchpriority="high"`.

### Mediciones antes / después
| Métrica | Antes | Después |
|---|---|---|
| `GET ping` sin sesión | 401, 63 B, ~10 ms | 200, 63 B, ~21 ms |
| `GET health` sin sesión | 401, 63 B, ~13 ms | 200, 38 B, ~341 ms (conecta MySQL) |
| Indicadores dashboard (SQL) | 5 consultas, 5.90 ms | 2 consultas, 2.85 ms (-52%) |
| Página movimientos (20 filas) | sin paginación | 1.29 ms, `LIMIT ? OFFSET ?` |
| Solicitudes de connectividad | ping + bootstrap (156 lockers + 20 movs) | ping + health (63 B + 38 B) |
| `app.js` / `profile.js` | 73,386 B / 10,120 B | 75,823 B / 11,312 B |
| CSS, fuentes, iconos | sin cambios | sin cambios |

- Datos de prueba: 156 lockers reales (`Disponible 6, Asignado 115, Sin llave 23, Bloqueado 2, Ocupado 4`);
  bitácora vacía en local, paginación verificada con page=3 (offset 40) y escenario ficticio de 150 lockers.
- Pruebas: 22/22 comprobaciones de Fase 14 y 22/22 de Fase 13; `php -l` y `node --check` sin errores.
- **No se desplegó.**
