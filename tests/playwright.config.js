// tests/playwright.config.js
// Configuración de Playwright para Grand Sirenis Locker App.
//
// Navegador: usa Chrome o Edge instalado en Windows (sin descargar nada).
// Servidor: se inicia aparte. Para E2E aislado, usar scripts/run-e2e.ps1,
// que apunta a la base de pruebas hotel_lockers_test en el puerto 8001.
//
// Variables:
//   PLAYWRIGHT_BASE_URL                  (por defecto http://127.0.0.1:8000)
//   PLAYWRIGHT_CHROME_EXECUTABLE_PATH    (ruta explícita a Chrome/Edge)

const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');

const candidates = [
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const browserPath = candidates.find((file) => fs.existsSync(file));

module.exports = defineConfig({
  // Relativo a este archivo: tests/e2e (no tests/tests/e2e).
  testDir: './e2e',
  outputDir: './results',
  // El estado de la base de datos es compartido: ejecución secuencial.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,
    navigationTimeout: 30000,
    launchOptions: browserPath ? { executablePath: browserPath } : {},
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // El servidor PHP se gestiona desde scripts/run-e2e.ps1 para poder
  // seleccionar la base de pruebas y detenerlo siempre al terminar.
  webServer: undefined,
});
