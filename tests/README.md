# Pruebas Playwright — Grand Sirenis Locker App

## Configuración
- Archivo: `tests/playwright.config.js`
- Navegador: Chromium (Desktop Chrome)
- URL base: `http://127.0.0.1:8000`
- Directorio de pruebas: `tests/e2e/`
- Reportes: `tests/results/`, `playwright-report/`
- Capturas: solo en fallo (`screenshot: 'only-on-failure'`)
- Traces: en primer reintento (`trace: 'on-first-retry'`)

## Pruebas implementadas
Archivo: `tests/e2e/auth.spec.js`

| Prueba | Descripción | Estado |
|---|---|---|
| `abrir login, enviar credenciales invalidas y verificar mensaje de error` | Abre `/login.php`, completa credenciales sintéticas, verifica mensaje de error y que no se accede al dashboard. | Pendiente de ejecución |
| `acceso sin sesion a index.php redirige a login` | Abre `/index.php` sin sesión, verifica redirección a `/login.php`. | Pendiente de ejecución |

## Requisitos previos
1. Servidor PHP activo: `php -S 127.0.0.1:8000 -t public` (o `scripts/start-dev.ps1`).
2. MySQL activo (XAMPP).
3. Base de datos `hotel_lockers` importada (`db/schema.sql`).
4. Playwright instalado: `npm install --save-dev playwright` + `npx playwright install chromium`.

## Ejecución
```
npx playwright test --browser=chromium
```
o mediante `scripts/run-tests.ps1`.

## Reglas
- No ejecutar pruebas destructivas sobre datos reales.
- Usar datos sintéticos (credenciales de prueba inexistentes).
- Si el servidor no está disponible, la prueba queda bloqueada (error de conexión) y se documenta el motivo.
