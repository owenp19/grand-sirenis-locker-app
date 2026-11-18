# Skill: playwright-testing

**Nombre:** Playwright Browser Automation  
**Ubicación:** `.agents/skills/playwright-testing/SKILL.md`  
**Procedencia:** Skill personalizado creado para Grand Sirenis Locker App  
**Estado:** Instalado y configurado (Fase 2); pruebas iniciales pendientes de ejecución (Fase 5)  
**Versión:** 1.0.0

---

## Descripción

Skill para instalar, configurar y ejecutar Playwright como herramienta funcional de desarrollo y pruebas end-to-end de la aplicación Grand Sirenis Locker App. Permite abrir la aplicación local, navegar por pantallas, interactuar con botones, completar formularios, probar autenticación, capturar screenshots, detectar errores de JavaScript, revisar solicitudes HTTP fallidas, evaluar diferentes resoluciones y ejecutar pruebas E2E sobre Chromium.

Este skill se activa cuando se necesita verificar el funcionamiento de la aplicación desde el navegador, especialmente antes y después de cambios en UI/UX, formularios de autenticación o endpoints de la API.

**Reglas críticas:**
- Las pruebas se ejecutan sobre un entorno local o de testing, con datos sintéticos cuando sea necesario.
- No ejecutar pruebas destructivas en producción ni sobre datos reales sin respaldo y autorización.
- Cuando se trabaje en UI/UX, toda modificación visual significativa debe revisarse mediante Playwright.
- Implementar al menos una prueba reproducible y registrar su resultado.
- Si no se puede acceder a la aplicación, documentar el bloqueo.

---

## Requisitos de entorno

- Node.js v26.13.0 (instalado) y npm 11.19.1.
- Windows 10 x64 (nativo, sin WSL asumido).
- PHP 8.2.12 y MariaDB 10.4.32 ejecutándose localmente (puerto 8000 y 3306).
- Playwright se instala como dependencia de desarrollo (`npm init -y` + `npm install --save-dev playwright` o `npx playwright install chromium`).

---

## Archivos de configuración propuestos

| Archivo | Ruta | Propósito |
|---|---|---|
| Configuración Playwright | `tests/playwright.config.ts` o `playwright.config.js` | Navegador Chromium, URL base `http://127.0.0.1:8000`, tiempo de espera, screenshots |
| Prueba inicial | `tests/e2e/auth.spec.js` | Flujo: abrir login, verificar elementos, intento fallido, bloqueo de sesión |
| Datos sintéticos | `tests/fixtures/` | Usuarios y lockers de prueba (no datos reales) |
| Evidencias | `tests/results/` o `playwright-report/` | Screenshots, reportes, traces |

> Las rutas exactas se confirman al instalar Playwright en la Fase 5.

---

## Procedimientos de trabajo

1. **Verificar compatibilidad:** comprobar que Node.js y Windows soporten la versión de Playwright a instalar.
2. **Instalar Playwright:** `npm init -y` (si no existe `package.json`), `npm install --save-dev playwright`, `npx playwright install chromium`.
3. **Crear `playwright.config.js`:** URL base `http://127.0.0.1:8000`, Chromium, `headless` opcional, directorio de screenshots y reportes.
4. **Crear prueba reproducible:** al menos un spec que cubra el flujo de autenticación (abrir login, completar credenciales inválidas, verificar mensaje de error, verificar que no se accede al dashboard).
5. **Ejecutar la prueba:** `npx playwright test` sobre Chromium.
6. **Capturar evidencia:** screenshots y reporte HTML en `tests/results/` o `playwright-report/`.
7. **Registrar resultado:** exitoso, fallido o bloqueado (con motivo) en `docs/SESSION_STATE.md` y `docs/CHANGELOG.md`.
8. **No ejecutar pruebas destructivas:** no usar datos reales ni operaciones de borrado sobre la base de producción.

---

## Prueba inicial sugerida (reproducible)

1. Abrir `http://127.0.0.1:8000/login.php`.
2. Verificar que el título y el formulario de login están presentes.
3. Enviar credenciales inválidas.
4. Verificar que aparece un mensaje de error y que no se redirige al dashboard.
5. (Opcional) Verificar que `index.php` sin sesión redirige a `login.php`.

---

## Condiciones de activación

- Se requiere verificar el funcionamiento de la aplicación desde el navegador.
- Se va a realizar una modificación visual significativa (UI/UX).
- Se necesita detectar errores de JavaScript o solicitudes HTTP fallidas.
- Se solicita ejecutar pruebas end-to-end sobre Chromium.

---

## Reglas de calidad

- Las pruebas deben ser deterministas y reproducibles.
- Usar datos sintéticos; nunca credenciales reales en los specs.
- Capturar screenshots en fallos para diagnóstico.
- No dejar pruebas fallidas sin documentar.
- Si el entorno no está disponible (PHP/MySQL no iniciados), documentar el bloqueo y continuar con tareas independientes.

---

## Recursos de referencia

- `docs/DIAGNOSTICO.md` (endpoints y rutas de la aplicación)
- `public/login.php`, `public/register.php`, `public/index.php`
- `public/api.php` (contrato de la API)

---

## Scripts auxiliares

- `scripts/run-tests.ps1` (definido por `windows-automation`) para ejecutar `npx playwright test`.
