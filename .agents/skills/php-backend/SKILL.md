# Skill: php-backend

**Nombre:** PHP Backend Architect  
**Ubicación:** `.agents/skills/php-backend/SKILL.md`  
**Procedencia:** Skill personalizado creado para Grand Sirenis Locker App  
**Estado:** Instalado y configurado (Fase 2)  
**Versión:** 1.0.0

---

## Descripción

Arquitecto de backend PHP para la aplicación Grand Sirenis Locker App. Su responsabilidad es diseñar, implementar y mantener la lógica del servidor: conexión a MySQL mediante PDO, gestión de sesiones, autenticación, autorización, validación de datos, manejo de errores y endpoints seguros (`api.php`, `login.php`, `register.php`, `logout.php`, `bootstrap.php`).

Sigue estándares PSR pertinentes y evita mezclar innecesariamente HTML, SQL y lógica de negocio. No crea controladores ni servicios vacíos solo por cumplir una estructura.

Este skill se activa cuando el usuario solicita cambios en `private/`, `public/api.php`, `public/login.php`, `public/register.php`, `public/logout.php`, `public/setup.php` o `public/index.php` (parte PHP).

---

## Especialización

- PHP moderno compatible con PHP 8.2+ (`declare(strict_types=1)`, tipos de retorno, `nullsafe`, `match`, enumeraciones si aplica).
- Arquitectura modular y separación de responsabilidades.
- PDO con consultas preparadas (`EMULATE_PREPARES => false`, `ERRMODE_EXCEPTION`).
- Manejo de sesiones seguras (`session.use_strict_mode`, `HttpOnly`, `SameSite=Lax`, `session_regenerate_id`).
- Autenticación con `password_hash` / `password_verify`.
- Autorización basada en roles (`administrador`, `operador`).
- Validación de datos de entrada (longitud, formato, fecha, valores permitidos).
- Manejo de errores: no exponer mensajes internos al usuario final; usar `error_log` y respuestas genéricas.
- Endpoints seguros con validación CSRF y control de longitud de cuerpo (`CONTENT_LENGTH`).
- Patrones de diseño solo cuando aporten valor real (singleton para la conexión PDO, transacciones para operaciones críticas).

---

## Estándares aplicados

- PSR-1 (Basic Coding Standard).
- PSR-12 (Extended Coding Style).
- PSR-4 no aplica (no hay autoload de clases; el proyecto usa funciones globales en `bootstrap.php`).

---

## Reglas de trabajo

1. **No mezclar innecesariamente HTML, SQL y lógica de negocio.** El PHP de las vistas debe limitarse a presentar datos ya preparados.
2. **No crear controladores o servicios vacíos.** Solo añadir archivos o funciones cuando tengan una responsabilidad concreta.
3. Todas las consultas a MySQL deben usar sentencias preparadas.
4. Nunca mostrar `e->getMessage()` ni stack traces al cliente; usar `respond(['ok'=>false, 'message'=>'...'])` genérico y `error_log` para el detalle.
5. Las rutas sensibles requieren `require_login(true)` para API y `require_login()` para vistas.
6. Las mutaciones de datos requieren token CSRF válido.
7. Usar transacciones (`beginTransaction`/`commit`/`rollBack`) para operaciones que tocan varias filas (ej. `transfer` en `api.php`).
8. Mantener `display_errors = 0` en producción/desarrollo local.

---

## Condiciones de activación

- Se solicita crear o modificar un endpoint de `api.php`.
- Se necesita cambiar la lógica de autenticación, registro o sesión en `bootstrap.php`, `login.php`, `register.php` o `logout.php`.
- Se requiere validación de datos de entrada o manejo de errores en PHP.
- Se reportan problemas de conexión a MySQL o de transacciones.

---

## Procedimientos de trabajo

1. Leer el archivo PHP completo antes de editarlo.
2. Verificar que no exista ya una función o helper reutilizable en `bootstrap.php`.
3. Implementar el cambio usando PDO y consultas preparadas.
4. Añadir validación de entrada y manejo de errores sin exponer detalles internos.
5. Ejecutar `php -l` para verificar sintaxis.
6. Si toca la base de datos, coordinar con el skill `mysql-database` y no ejecutar operaciones destructivas sin autorización.
7. Registrar el cambio en `docs/SESSION_STATE.md` y `docs/CHANGELOG.md`.

---

## Recursos de referencia

- `private/bootstrap.php` (conexión PDO, sesiones, CSRF, helpers)
- `private/config.php` (credenciales; no commitear valores reales)
- `public/api.php` (contrato de acciones y exportaciones)
- `public/login.php`, `public/register.php`, `public/logout.php`
- `docs/DIAGNOSTICO.md`

---

## Scripts auxiliares

Ninguno requerido en esta fase.
