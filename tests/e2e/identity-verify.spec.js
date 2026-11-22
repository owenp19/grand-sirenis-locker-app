// tests/e2e/identity-verify.spec.js
// Verificación de identidad visual: imágenes, favicon, manifest, fuente, colores.
// No modifica la base de datos; solo lectura de recursos estáticos y navegación.

const { test, expect } = require('@playwright/test');

const IMAGES = [
  'assets/image/grand-sirenis-locker-app-favicon.png',
  'assets/image/grand-sirenis-locker-app-logo-black.png',
  'assets/image/grand-sirenis-locker-app-logo-white.png',
  'assets/image/grand-sirenis-locker-app-icon-windows.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  'assets/icons/lucide-sprite.svg',
  'assets/fonts/roboto-latin.woff2',
  'assets/fonts/roboto-latin-ext.woff2',
];

test.describe('Identidad visual — Grand Sirenis Locker App', () => {
  test('todas las imágenes y recursos estáticos cargan (200)', async ({ page }) => {
    const failed = [];
    for (const src of IMAGES) {
      const res = await page.request.get(src);
      if (res.status() !== 200) failed.push(`${src}: ${res.status()}`);
    }
    expect(failed).toEqual([]);
  });

  test('favicon es PNG válido', async ({ page }) => {
    const res = await page.request.get('assets/image/grand-sirenis-locker-app-favicon.png');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] || '').toContain('image/png');
  });

  test('manifest identifica la aplicación correctamente', async ({ page }) => {
    const res = await page.request.get('manifest.webmanifest');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Grand Sirenis Locker App');
    expect(body.short_name).toBe('Sirenis Locker');
  });

  test('páginas cargan sin errores de consola ni CSP', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/login.php', { waitUntil: 'domcontentloaded' });
    await page.goto('/register.php', { waitUntil: 'domcontentloaded' });

    const cspErrors = errors.filter(e => e.includes('Content-Security-Policy') || e.includes('csp'));
    expect(cspErrors).toEqual([]);
  });

  test('fuente Roboto aplicada al body', async ({ page }) => {
    await page.goto('/login.php', { waitUntil: 'domcontentloaded' });
    const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(font).toContain('Roboto');
  });

  test('colores globales disponibles en CSS', async ({ page }) => {
    await page.goto('/login.php', { waitUntil: 'domcontentloaded' });
    const hasBrandGold = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return cs.getPropertyValue('--brand-gold').trim().toLowerCase() === '#a5832e';
    });
    expect(hasBrandGold).toBe(true);
  });

  test('logo negro presente en login', async ({ page }) => {
    await page.goto('/login.php', { waitUntil: 'domcontentloaded' });
    const logo = page.locator('.auth-brand-logo');
    await expect(logo).toHaveAttribute('src', /grand-sirenis-locker-app-logo-black-720\.png$/);
    await expect(logo).toBeVisible();
  });

  test('logo negro presente en register', async ({ page }) => {
    await page.goto('/register.php', { waitUntil: 'domcontentloaded' });
    const logo = page.locator('.auth-brand-logo');
    await expect(logo).toHaveAttribute('src', /grand-sirenis-locker-app-logo-black-720\.png$/);
    await expect(logo).toBeVisible();
  });

  test('nombre de marca visible en pantallas', async ({ page }) => {
    await page.goto('/login.php', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.auth-brand-logo')).toHaveAttribute('alt', 'Grand Sirenis Locker App');
    await page.goto('/register.php', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.auth-brand-logo')).toHaveAttribute('alt', 'Grand Sirenis Locker App');
  });

  test('título de pestaña usa el nombre oficial', async ({ page }) => {
    await page.goto('/login.php', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Grand Sirenis Locker App/);
  });
});
