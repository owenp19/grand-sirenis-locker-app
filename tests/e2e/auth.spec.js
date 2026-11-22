// tests/e2e/auth.spec.js
// Prueba E2E reproducible: flujo de autenticación de Grand Sirenis Locker App.
// Datos sintéticos; no usa credenciales reales ni datos de produccion.

const { test, expect } = require('@playwright/test');

test.describe('Autenticación - Grand Sirenis Locker App', () => {
  test('abrir login, enviar credenciales invalidas y verificar mensaje de error', async ({ page }) => {
    // 1. Abrir la pagina de login
    await page.goto('/login.php', { waitUntil: 'domcontentloaded' });

    // 2. Verificar elementos esenciales del formulario
    await expect(page.locator('#auth-title')).toContainText('Inicia sesión');
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // 3. Enviar credenciales invalidas (sinteticas)
    await page.fill('input#username', 'usuario_inexistente_prueba');
    await page.fill('input#password', 'ContrasenaInvalida123!');
    await page.click('button[type="submit"]');

    // 4. Verificar que aparece un mensaje de error y NO se accede al dashboard
    const errorAlert = page.locator('.auth-alert.error, .auth-alert');
    await expect(errorAlert).toBeVisible();

    // La URL debe seguir siendo login (no redirigido a index.php)
    await expect(page).toHaveURL(/.*\/login\.php/);

    // 5. Verificar que no hay elementos del dashboard (sidebar, view)
    await expect(page.locator('#app')).not.toBeVisible();
    await expect(page.locator('.sidebar')).not.toBeVisible();
  });

  test('acceso sin sesion a index.php redirige a la portada', async ({ page }) => {
    await page.goto('/index.php', { waitUntil: 'domcontentloaded' });
    // Sin sesión, la aplicación muestra primero la portada pública.
    await expect(page).toHaveURL(/.*\/welcome\.php/);
  });
});
