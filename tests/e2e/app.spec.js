// tests/e2e/app.spec.js
// Verificación integral: autenticación, permisos, inventario, colaboradores,
// asignación, liberación, traslado, movimientos, incidencias, CSRF, XSS,
// persistencia y concurrencia. Datos sintéticos sobre hotel_lockers_test.

const { test, expect, request: apiRequest } = require('@playwright/test');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8000';
const ADMIN_USER = 'admin.e2e';
const ADMIN_PASS = 'E2eAdmin!2026-Clave';
const OPERATOR_USER = 'operador.e2e';
const OPERATOR_PASS = 'E2eOper!2026-Clave';

let context;
let page;
let pageErrors = [];
let assignedLocker = '';
let assignedName = '';
let operatorLocker = '';

const today = () => new Date().toISOString().slice(0, 10);

async function bootstrap(target = page) {
  const result = await target.evaluate(async () => {
    const res = await fetch('api.php?resource=bootstrap', { credentials: 'same-origin' });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    return { status: res.status, data };
  });
  return result;
}

async function post(target, resource, body, withCsrf = true) {
  return target.evaluate(async ({ resource, body, withCsrf }) => {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (withCsrf) {
      headers['X-CSRF-Token'] = document.querySelector('meta[name="csrf-token"]')?.content || '';
    }
    const res = await fetch(`api.php?resource=${encodeURIComponent(resource)}`, {
      method: 'POST', credentials: 'same-origin', headers, body: JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    return { status: res.status, data };
  }, { resource, body, withCsrf });
}

function freeLocker(data, exclude = []) {
  return (data.lockers || []).find(
    (l) => l.status === 'Disponible' && !String(l.name || '').trim() && !exclude.includes(l.id)
  );
}

function lockerById(data, id) {
  return (data.lockers || []).find((l) => l.id === id);
}

async function login(target, username, password) {
  await target.goto('/login.php');
  await target.fill('#username', username);
  await target.fill('#password', password);
  await Promise.all([
    target.waitForURL(/index\.php/),
    target.click('button[type="submit"]'),
  ]);
  await expect(target.locator('#view h1')).toContainText('Panel de control');
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ baseURL: BASE, viewport: { width: 1280, height: 800 } });
  page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
});

test.afterAll(async () => {
  await context?.close();
});

test('1. primer administrador: registro inicial y acceso al dashboard', async () => {
  await page.goto('/register.php');
  await expect(page.locator('#register-title')).toContainText('Crea tu cuenta');
  await page.fill('#display_name', 'Administrador E2E');
  await page.fill('#username', ADMIN_USER);
  await page.fill('#password', ADMIN_PASS);
  await page.fill('#password_confirm', ADMIN_PASS);
  await Promise.all([
    page.waitForURL(/index\.php/),
    page.click('button[type="submit"]'),
  ]);
  await expect(page.locator('#view h1')).toContainText('Panel de control');
  await expect(page.locator('.stat-num').first()).toHaveText('156');
});

test('2. inventario y colaboradores leen los 156 lockers desde MariaDB', async () => {
  await page.locator('.navigation [data-page="lockers"]').click();
  await expect(page.locator('#view h1')).toContainText('Inventario de lockers');
  await expect(page.locator('.pagination')).toContainText('156 resultados');
  await expect(page.locator('tbody tr')).toHaveCount(16);

  await page.locator('.navigation [data-page="people"]').click();
  await expect(page.locator('#view h1')).toContainText('Colaboradores');
  await expect(page.locator('.pagination')).toContainText('resultados');
});

test('3. API sin sesión, cabeceras de seguridad y CSRF', async ({ request }) => {
  const loginPage = await request.get('/login.php');
  expect(loginPage.status()).toBe(200);
  const headers = loginPage.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['cache-control']).toContain('no-store');

  expect((await request.get('/api.php?resource=bootstrap')).status()).toBe(401);
  expect((await request.get('/api.php?resource=export&type=backup')).status()).toBe(401);

  const noCsrf = await post(page, 'assign', { locker: 'x' }, false);
  expect(noCsrf.status).toBe(403);
  expect(noCsrf.data.ok).toBe(false);
});

test('4. asignación desde la interfaz y persistencia tras recargar', async () => {
  await page.locator('.navigation [data-page="dashboard"]').click();
  await expect(page.locator('.hero')).toBeVisible();
  const data = (await bootstrap()).data;
  const locker = freeLocker(data);
  expect(locker).toBeTruthy();
  assignedLocker = locker.id;
  assignedName = `E2E Asignado ${Date.now()}`;

  await page.locator('.hero [data-action="assign"]').click();
  await expect(page.locator('#operationForm')).toBeVisible();
  await page.selectOption('#f_locker', assignedLocker);
  await page.fill('#f_name', assignedName);
  await page.fill('#f_department', 'Pruebas E2E');
  await page.fill('#f_supervisor', 'QA');
  await page.selectOption('#f_condition', 'Bueno');
  await page.fill('#f_by', 'QA E2E');
  await page.fill('#f_notes', 'Asignación creada por la suite E2E.');
  await page.click('button[form="operationForm"]');
  await expect(page.locator('#toast')).toContainText('asignado correctamente');
  await expect(page.locator('#operationForm')).toHaveCount(0);

  const after = (await bootstrap()).data;
  const row = lockerById(after, assignedLocker);
  expect(row.status).toBe('Asignado');
  expect(row.name).toBe(assignedName);
  expect(after.movements.some((m) => m.type === 'Asignación' && m.locker === assignedLocker)).toBe(true);

  await page.reload();
  await expect(page.locator('#view h1')).toContainText('Panel de control');
  const persisted = lockerById((await bootstrap()).data, assignedLocker);
  expect(persisted.name).toBe(assignedName);
});

test('5. concurrencia: dos asignaciones simultáneas al mismo locker (una sola gana)', async () => {
  const data = (await bootstrap()).data;
  const locker = freeLocker(data, [assignedLocker]);
  expect(locker).toBeTruthy();
  const nameA = `E2E Carrera A ${Date.now()}`;
  const nameB = `E2E Carrera B ${Date.now()}`;
  const body = (name) => ({
    locker: locker.id, name, department: 'Pruebas E2E', supervisor: 'QA',
    condition: 'Bueno', date: today(), by: 'QA E2E', notes: 'Prueba de concurrencia E2E.',
  });

  const [first, second] = await Promise.all([
    post(page, 'assign', body(nameA)),
    post(page, 'assign', body(nameB)),
  ]);
  const statuses = [first.status, second.status].sort((a, b) => a - b);
  expect(statuses).toEqual([200, 409]);

  const row = lockerById((await bootstrap()).data, locker.id);
  expect(row.status).toBe('Asignado');
  expect([nameA, nameB]).toContain(row.name);
  // Liberar el locker ganador para no alterar las pruebas siguientes.
  const release = await post(page, 'release', {
    locker: locker.id, date: today(), reason: 'Renuncia', outcome: 'Disponible',
    by: 'QA E2E', notes: 'Limpieza tras prueba de concurrencia.',
  });
  expect(release.status).toBe(200);
});

test('6. liberación y registro en movimientos', async () => {
  const result = await post(page, 'release', {
    locker: assignedLocker, date: today(), reason: 'Renuncia', outcome: 'Disponible',
    by: 'QA E2E', notes: 'Liberación creada por la suite E2E.',
  });
  expect(result.status).toBe(200);
  expect(result.data.ok).toBe(true);

  const data = (await bootstrap()).data;
  const row = lockerById(data, assignedLocker);
  expect(row.status).toBe('Disponible');
  expect(String(row.name || '')).toBe('');
  expect(data.movements.some((m) => m.type === 'Liberación' && m.locker === assignedLocker)).toBe(true);
});

test('7. traslado de colaborador entre dos lockers', async () => {
  const data = (await bootstrap()).data;
  const source = freeLocker(data);
  const target = freeLocker(data, [source?.id]);
  expect(source).toBeTruthy();
  expect(target).toBeTruthy();
  const person = `E2E Traslado ${Date.now()}`;

  const assignSource = await post(page, 'assign', {
    locker: source.id, name: person, department: 'Pruebas E2E', supervisor: 'QA',
    condition: 'Regular', date: today(), by: 'QA E2E', notes: 'Asignación previa al traslado.',
  });
  expect(assignSource.status).toBe(200);
  // El destino debe estar libre: el traslado mueve al colaborador a un locker disponible.
  expect(lockerById((await bootstrap()).data, target.id).status).toBe('Disponible');

  const transfer = await post(page, 'transfer', {
    source: source.id, target: target.id, oldOutcome: 'Disponible',
    date: today(), by: 'QA E2E', notes: 'Traslado verificado por E2E.',
  });
  expect(transfer.status).toBe(200);

  const after = (await bootstrap()).data;
  expect(lockerById(after, target.id).name).toBe(person);
  expect(lockerById(after, source.id).status).toBe('Disponible');
  expect(after.movements.some((m) => m.type === 'Traslado')).toBe(true);
});

test('8. estado físico e incidencias visibles en la interfaz', async () => {
  const data = (await bootstrap()).data;
  const locker = freeLocker(data);
  expect(locker).toBeTruthy();
  const result = await post(page, 'status', {
    locker: locker.id, status: 'Dañado', by: 'QA E2E', notes: 'Daño simulado por E2E.',
  });
  expect(result.status).toBe(200);
  expect(lockerById((await bootstrap()).data, locker.id).status).toBe('Dañado');
  // La UI mantiene el estado en memoria: recargar para leer los movimientos creados por API.
  await page.reload();
  await expect(page.locator('#view h1')).toContainText('Panel de control');

  await page.locator('.navigation [data-page="issues"]').click();
  await expect(page.locator('#view h1')).toContainText('Incidencias');
  await expect(page.locator('#view')).toContainText('observaciones activas');

  await page.locator('.navigation [data-page="history"]').click();
  await expect(page.locator('#view h1')).toContainText('Bitácora de movimientos');
  await expect(page.locator('.history-item').first()).toBeVisible();
  await expect(page.locator('#view')).toContainText('Estado físico');
});

test('9. XSS: un nombre malicioso se muestra escapado, nunca como HTML', async () => {
  const data = (await bootstrap()).data;
  const locker = freeLocker(data);
  expect(locker).toBeTruthy();
  const payload = '<img src=x onerror=window.__xss=1>';
  const result = await post(page, 'assign', {
    locker: locker.id, name: payload, department: 'Pruebas E2E', supervisor: 'QA',
    condition: 'Bueno', date: today(), by: 'QA E2E', notes: 'Prueba XSS.',
  });
  expect(result.status).toBe(200);

  await page.reload();
  await expect(page.locator('#view h1')).toContainText('Panel de control');
  await page.locator('.navigation [data-page="lockers"]').click();
  await page.evaluate(() => {
    const input = document.getElementById('searchInput');
    input.value = 'onerror';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  const html = await page.locator('#view').innerHTML();
  expect(html).not.toContain('<img src=x');
  expect(html).toContain('&lt;img');
  expect(await page.locator('tbody img').count()).toBe(0);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();

  const release = await post(page, 'release', {
    locker: locker.id, date: today(), reason: 'Otro', outcome: 'Disponible',
    by: 'QA E2E', notes: 'Limpieza tras prueba XSS.',
  });
  expect(release.status).toBe(200);
});

test('10. limitación de intentos de acceso del lado servidor', async ({ request }) => {
  const loginPage = await request.get('/login.php');
  const csrf = (await loginPage.text()).match(/name="csrf" value="([^"]+)"/)?.[1];
  expect(csrf).toBeTruthy();

  let lastBody = '';
  for (let i = 0; i < 9; i += 1) {
    const response = await request.post('/login.php', {
      form: { csrf, username: 'nadie.e2e', password: 'ClaveInvalida!2026' },
    });
    lastBody = await response.text();
  }
  expect(lastBody).toContain('Demasiados intentos');

  // Contexto HTTP nuevo (sin cookies): el bloqueo persiste porque no es de sesión.
  const fresh = await apiRequest.newContext({ baseURL: BASE });
  try {
    const freshPage = await fresh.get('/login.php');
    const freshCsrf = (await freshPage.text()).match(/name="csrf" value="([^"]+)"/)?.[1];
    expect(freshCsrf).toBeTruthy();
    const blocked = await fresh.post('/login.php', {
      form: { csrf: freshCsrf, username: 'nadie.e2e', password: 'ClaveInvalida!2026' },
    });
    expect(await blocked.text()).toContain('Demasiados intentos');
  } finally {
    await fresh.dispose();
  }
});

test('11. permisos: el administrador crea un operador y el operador no crea usuarios', async () => {
  await page.goto('/register.php');
  await page.fill('#display_name', 'Operador E2E');
  await page.fill('#username', OPERATOR_USER);
  await page.selectOption('#role', 'operador');
  await page.fill('#password', OPERATOR_PASS);
  await page.fill('#password_confirm', OPERATOR_PASS);
  await page.click('button[type="submit"]');
  await expect(page.locator('.auth-alert.success')).toContainText('Cuenta creada correctamente');

  await page.goto('/index.php');
  await expect(page.locator('#view h1')).toContainText('Panel de control');
  await page.locator('.sidebar form[action="logout.php"] button[type="submit"]').click();
  await page.waitForURL(/login\.php/);

  await login(page, OPERATOR_USER, OPERATOR_PASS);
  await expect(page.locator('.user-admin-link')).toHaveCount(0);

  const forbidden = await page.goto('/register.php');
  expect(forbidden.status()).toBe(403);
  await expect(page.locator('.auth-restricted')).toContainText('Registro protegido');

  await page.goto('/index.php');
  await expect(page.locator('#view h1')).toContainText('Panel de control');

  const data = (await bootstrap()).data;
  const locker = freeLocker(data);
  expect(locker).toBeTruthy();
  operatorLocker = locker.id;
  const assign = await post(page, 'assign', {
    locker: operatorLocker, name: `E2E Operador ${Date.now()}`, department: 'Pruebas E2E',
    supervisor: 'QA', condition: 'Bueno', date: today(), by: 'Operador E2E', notes: 'Asignación de operador.',
  });
  expect(assign.status).toBe(200);
});

test('12. logout invalida la sesión y protege las rutas', async () => {
  await page.goto('/index.php');
  await page.locator('.sidebar form[action="logout.php"] button[type="submit"]').click();
  await page.waitForURL(/login\.php/);

  await page.goto('/index.php');
  await expect(page).toHaveURL(/login\.php/);
  const api = await bootstrap();
  expect(api.status).toBe(401);

  expect(pageErrors).toEqual([]);
});
