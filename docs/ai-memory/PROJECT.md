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
| **8** | Optimización rendimiento | ✅ | (último en master) |
| **9** | Memoria y documentación | ✅ | (actualización actual) |

## Capturas devalidación final
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
