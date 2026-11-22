# Skill: windows-automation

**Nombre:** Windows Development Automation  
**Ubicación:** `.agents/skills/windows-automation/SKILL.md`  
**Procedencia:** Skill personalizado creado para Grand Sirenis Locker App  
**Estado:** Instalado y configurado (Fase 2); scripts por crear en Fase 3/6  
**Versión:** 1.0.0

---

## Descripción

Especialista en automatización de desarrollo sobre Windows para la aplicación Grand Sirenis Locker App. Su responsabilidad es crear y mantener scripts de PowerShell que faciliten el inicio del entorno local, la verificación de puertos, la ejecución de pruebas, el respaldo de la base de datos y el uso de Git, sin asumir la existencia de Bash ni WSL.

Este skill se activa cuando se necesitan scripts para arrancar el servidor PHP, validar el entorno, ejecutar pruebas o hacer copias de seguridad de la base de datos en Windows.

**Reglas críticas:**
- No asumir que existe Bash ni WSL.
- No instalar servicios de Windows ni cambiar configuraciones globales sin autorización.
- No almacenar credenciales en los scripts.
- Cada script debe responder a una necesidad real; no crear scripts innecesarios.
- Priorizar herramientas compatibles con Windows (PowerShell, PHP integrado, mysql.exe de XAMPP).

---

## Scripts propuestos (necesidad real validada)

| Script | Ruta propuesta | Propósito |
|---|---|---|
| Inicio de entorno de desarrollo | `scripts/start-dev.ps1` | Inicia PHP (`php -S 127.0.0.1:8000 -t public`) y verifica que MySQL esté disponible; alternativa a `iniciar-servidor.bat` |
| Verificación de entorno | `scripts/check-environment.ps1` | Verifica versiones de PHP, Node, MySQL, extensiones `pdo_mysql`/`session`, puerto 8000 libre, conectividad a MySQL |
| Ejecución de pruebas | `scripts/run-tests.ps1` | Ejecuta `php -l` sobre archivos PHP y, si existe, `npx playwright test` |
| Respaldo de base de datos | `scripts/backup-database.ps1` | Exporta `sirenis_locker_db` con `mysqldump` (XAMPP) a `storage/backups/` con fecha; no almacena credenciales en el script |

> Las rutas y contenidos exactos se crean en la Fase de automatización Windows, tras validar que cada uno responde a una necesidad real.

---

## Procedimientos de trabajo

1. Verificar que PHP está en el PATH o usar `C:\xampp\php\php.exe` como alternativa (patrón ya usado en `iniciar-servidor.bat`).
2. Verificar que MySQL está activo antes de iniciar pruebas (conexión a `127.0.0.1:3306`).
3. Verificar que el puerto 8000 esté libre antes de iniciar `php -S`.
4. Los scripts deben leer credenciales de variables de entorno, no escribirlas en texto plano.
5. Cada script debe salir con código de error claro y mensajes en español.
6. Registrar la creación de cada script en `docs/SESSION_STATE.md`.

---

## Condiciones de activación

- El usuario necesita iniciar el servidor de desarrollo en Windows.
- Se requiere validar que el entorno esté listo antes de programar o probar.
- Se necesita ejecutar pruebas PHP o Playwright desde un script.
- Se requiere hacer un respaldo de la base de datos local.

---

## Reglas de calidad

- Scripts en PowerShell (`.ps1`), compatibles con Windows PowerShell 5.1 y PowerShell 7.
- Manejo de errores con `try/catch` y `Write-Error` / `Write-Host`.
- Códigos de salida (`exit /b` o `exit`) para integración con VS Code y CI.
- No almacenar contraseñas ni tokens en los scripts.
- No modificar configuración global del sistema ni instalar servicios de Windows sin autorización.

---

## Recursos de referencia

- `iniciar-servidor.bat` (script existente de arranque PHP)
- `.vscode/tasks.json` (tarea VS Code para iniciar PHP)
- `private/config.php` (credenciales; referencia solo, no leer en scripts)
- `db/schema.sql`, `db/seed.sql` (base de datos para respaldo)

---

## Scripts auxiliares

Los propios scripts de automatización (`start-dev.ps1`, `check-environment.ps1`, `run-tests.ps1`, `backup-database.ps1`) son el entregable de este skill.
