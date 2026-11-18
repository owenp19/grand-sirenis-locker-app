// tests/playwright.config.js
// Configuracion de Playwright para Grand Sirenis Locker App.
// Pruebas E2E sobre Chromium en el servidor local de desarrollo.
//
// NOTA: La descarga del Chromium oficial de Playwright (~207 MiB) no pudo
// completarse por inestabilidad de red (ECONNRESET/timeout). Como alternativa,
// se puede usar el Google Chrome ya instalado en el sistema mediante la
// variable de entorno PLAYWRIGHT_CHROME_EXECUTABLE_PATH o el valor por defecto
// de Windows. Si no hay navegador disponible, las pruebas quedan BLOQUEADAS
// y se documentan como tales (no se inventan resultados).
//
// Las pruebas requieren:
//   1. Servidor PHP activo: php -S 127.0.0.1:8000 -t public
//   2. MySQL activo (XAMPP) y base de datos hotel_lockers creada

const { defineConfig, devices } = require('@playwright/test');

const chromeExecutablePath =
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // Entorno local de la app
  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    actionTimeout: 10000,
    navigationTimeout: 30000,
    // Usar Chrome del sistema si está disponible; si no, Playwright usará su
    // propio Chromium (que no se pudo descargar por red).
    executablePath: require('fs').existsSync(chromeExecutablePath)
      ? chromeExecutablePath
      : undefined,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // El servidor PHP se inicia por separado (start-dev.ps1 / iniciar-servidor.bat).
  // No se lanza webServer automaticamente para evitar procesos huérfanos.
  webServer: undefined,

  outputDir: './tests/results',
});
