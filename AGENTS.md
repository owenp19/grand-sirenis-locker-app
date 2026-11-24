# AGENTS.md — Grand Sirenis Locker App

## 1. Objetivo
App local, ligera y segura para gestionar lockers de colaboradores (156 lockers): dashboard, inventario, asignación, liberación, traslado, colaboradores, movimientos, incidencias, exportación CSV/JSON. Autenticación por roles (administrador / operador), PWA instalable. Sin frameworks pesados.

## 2. Stack
PHP 8.2, MariaDB 10.4 (XAMPP), HTML5/CSS3/JS vanilla, PWA (manifest + sw.js), Playwright E2E. Recursos locales: Roboto WOFF2, Lucide sprite SVG.

## 3. Arquitectura
- `public/`: index.php (dashboard), login.php, register.php, logout.php, api.php, setup.php, sw.js, manifest.webmanifest, assets/ (css, fonts, icons, image)
- `private/`: config.php, bootstrap.php (PDO singleton, sesiones, CSRF, helpers h()/csrf_token()/respond()/fail())
- `db/`: schema.sql, seed.sql, migrations/001_roles_usuarios.sql
- Servidor: `php -S 127.0.0.1:8000 -t public`

## 4. Reglas esenciales
- `declare(strict_types=1)`, PDO preparadas (`EMULATE_PREPARES => false`), `password_hash`/`verify`
- Helpers de bootstrap.php: `h()`, `csrf_token()`, `field()`, `valid_date()`, `respond()`, `fail()`
- Sin librerías externas, sin CDN, sin `style="..."` en HTML generado
- CSRF en formularios y header `X-CSP-Token` para API; sesiones HttpOnly/SameSite=Lax
- Cabeceras de seguridad ya aplicadas (CSP, X-Content-Type-Options, X-Frame-Options: DENY)
- No exponer errores internos al usuario (`error_log` + respuestas genéricas)
- PHP/MySQL solo en 127.0.0.1, nunca en internet

## 5. Sistema de memoria (AI memory)
- `docs/ai-memory/PROJECT.md` — contexto general del proyecto
- `docs/ai-memory/UI_SYSTEM.md` — sistema visual global (tema, componentes, iconos)
- `docs/ai-memory/screens/<pantalla>.md` — memoria por pantalla (dashboard, login, register, welcome, inventory, etc.)

## 6. Reglas de operación (prioridad máxima: ahorro de tokens)
- Nunca auditoría completa para modificar una pantalla.
- No leer toda la documentación al iniciar.
- Consultar primero la memoria específica de la pantalla.
- Leer solamente los archivos necesarios.
- No abrir archivos completos cuando una búsqueda puntual sea suficiente.
- No explorar dependencias, respaldos ni archivos generados.
- No cargar Skills innecesarias.
- No repetir análisis ya documentados.
- No modificar archivos fuera del alcance solicitado.
- No usar subagentes para tareas sencillas.
- Responder de forma breve.

## 7. Lectura inteligente
- "Modifica Dashboard" → AGENTS.md + UI_SYSTEM.md + screens/dashboard.md + código necesario
- "Modifica Login" → UI_SYSTEM.md + screens/login.md + código necesario de login
- PROJECT.md solo si falta contexto de arquitectura.

## 8. Skills bajo demanda
- UI/UX: ui-ux-desktop, frontend-engineering, frontend-design, design-system, responsive-design, accessibility
- Solo cargar las necesarias; no cargar MySQL/PHP/security/testing para cambios exclusivamente visuales.

## 9. Actualización automática al finalizar
- Modificar pantalla → actualizar exclusivamente su memoria en screens/<pantalla>.md
- Cambio tema global → actualizar UI_SYSTEM.md
- Cambio arquitectura → actualizar PROJECT.md
- No guardar conversaciones completas, no actualizar todos los documentos por cada modificación.

## 10. Prohibiciones
- No reconstruir el proyecto, no instalar frameworks, no modificar BD, no cambiar funcionalidades existentes, no eliminar documentación histórica, no modificar Dashboard todavía, no infraestructura de memoria compleja, no bases vectoriales ni embeddings.
