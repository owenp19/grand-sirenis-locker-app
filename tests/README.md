# Pruebas Playwright — Grand Sirenis Locker App

## Configuración
- Archivo: `tests/playwright.config.js`
- Navegador: Chrome o Edge instalado en Windows (vía `launchOptions.executablePath`).
- URL base: `PLAYWRIGHT_BASE_URL` (por defecto `http://127.0.0.1:8000`).
- Directorio de pruebas: `tests/e2e/` (`testDir: './e2e'`).
- Reportes: `playwright-report/`; artefactos: `tests/results/` (ignorados por Git).

## Pruebas implementadas
| Archivo | Cobertura | Estado |
|---|---|---|
| `tests/e2e/app.spec.js` | Registro inicial, dashboard, inventario, colaboradores, asignación UI, persistencia, concurrencia, liberación, traslado, estado físico, incidencias, movimientos, XSS, CSRF, rate limit, permisos, logout. | ✅ 12/12 |
| `tests/e2e/auth.spec.js` | Credenciales inválidas y redirección de ruta protegida. | ✅ 2/2 |

## Ejecución recomendada (base aislada)
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-e2e.ps1
```
El script:
1. Recrea `hotel_lockers_test` desde `hotel_lockers` (datos demo).
2. Concede al usuario de aplicación solo `SELECT/INSERT/UPDATE/DELETE`.
3. Arranca PHP en el puerto 8001 con `DB_NAME=hotel_lockers_test`.
4. Ejecuta Playwright y detiene el servidor incluso si hay fallos.

## Ejecución manual
```powershell
$env:DB_NAME='hotel_lockers_test'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:8001'
php -S 127.0.0.1:8001 -t public
# En otra terminal:
npx playwright test --config=tests/playwright.config.js
```

## Requisitos previos
1. PHP 8.2 y MySQL/MariaDB activos.
2. `node_modules` con `@playwright/test` (ya instalado).
3. Chrome o Edge instalado (no requiere descargar Chromium).
4. `.env` local con las credenciales del usuario de aplicación.

## Reglas
- Usar siempre datos sintéticos y la base `hotel_lockers_test`.
- No ejecutar pruebas destructivas sobre `hotel_lockers` ni datos reales.
- No declarar pruebas superadas sin ejecutarlas ni adjuntar resultados.
