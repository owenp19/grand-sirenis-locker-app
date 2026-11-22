// tests/manual/dashboard-visual-check.js
// Verificación visual y funcional del dashboard rediseñado.
// Uso: PLAYWRIGHT_BASE_URL=http://127.0.0.1:8001 node tests/manual/dashboard-visual-check.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8000';
const OUT = path.join('tests', 'results');
const chromePath = [
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean).find((p) => fs.existsSync(p));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromePath });
  const report = { console: [], pageErrors: [], failedRequests: [], checks: {} };
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') report.console.push(m.text());
  });
  page.on('pageerror', (e) => report.pageErrors.push(e.message));
  page.on('requestfailed', (r) => report.failedRequests.push(r.url() + ' -> ' + (r.failure() || {}).errorText));

  await page.goto(`${BASE}/login.php`, { waitUntil: 'load' });
  await page.fill('#username', process.env.E2E_USER || 'admin.e2e');
  await page.fill('#password', process.env.E2E_PASS || 'E2eAdmin!2026-Clave');
  await Promise.all([page.waitForURL(/index\.php/, { waitUntil: 'load' }), page.click('button[type="submit"]')]);
  await page.waitForSelector('#view .stat-num');
  await page.waitForTimeout(700);

  const at = async (width, height, name) => {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(OUT, name), fullPage: false });
    return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  };

  report.checks.desktop = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('#view h1')?.textContent?.trim(),
    activeNav: document.querySelector('.nav-btn[aria-current="page"]')?.textContent?.trim(),
    stats: [...document.querySelectorAll('.stat-num')].map((n) => n.textContent.trim()),
    inlineStyles: document.querySelectorAll('#view [style]').length,
    bootGone: !document.querySelector('.boot'),
    tableCards: getComputedStyle(document.querySelector('table') || document.body).minWidth,
    progressBars: document.querySelectorAll('.stat-progress').length,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    primaryBg: getComputedStyle(document.querySelector('.btn-primary')).backgroundColor,
  }));

  report.checks.overflowDesktop = await at(1440, 900, 'dashboard-desktop.png');
  report.checks.overflowLaptop = await at(1180, 800, 'dashboard-laptop.png');
  report.checks.overflowTablet = await at(900, 900, 'dashboard-tablet.png');
  report.checks.overflowMobile = await at(390, 844, 'dashboard-mobile.png');

  // Tablas como tarjetas en móvil
  await page.locator('.navigation [data-page="lockers"]').click();
  await page.waitForSelector('#view table');
  report.checks.hashAfterNav = await page.evaluate(() => location.hash);
  report.checks.tableMobile = await page.evaluate(() => {
    const row = document.querySelector('tbody tr');
    const cells = [...row.querySelectorAll('td')];
    return {
      theadHidden: getComputedStyle(document.querySelector('thead')).display === 'none',
      rowDisplay: getComputedStyle(row).display,
      labels: cells.map((c) => getComputedStyle(c, '::before').content).slice(0, 3),
    };
  });
  report.checks.overflowMobileTable = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: path.join(OUT, 'dashboard-mobile-table.png'), fullPage: false });

  // Búsqueda con debounce, sin pérdida de foco
  await page.fill('#searchInput', 'bloque');
  await page.waitForTimeout(350);
  report.checks.searchKeepsFocus = await page.evaluate(() => document.activeElement?.id === 'searchInput');

  // Historial y navegación por URL
  await page.locator('.navigation [data-page="history"]').click();
  await page.waitForSelector('#view .history-item, #view .empty');
  const historyHash = await page.evaluate(() => location.hash);
  await page.goBack();
  await page.waitForTimeout(300);
  report.checks.backToLockers = await page.evaluate(() => ({ hash: location.hash, h1: document.querySelector('#view h1')?.textContent?.trim() }));
  await page.goForward();
  await page.waitForTimeout(300);
  report.checks.forwardToHistory = await page.evaluate(() => ({ hash: location.hash, h1: document.querySelector('#view h1')?.textContent?.trim() }));
  report.checks.historyHash = historyHash;

  // Enlace de salto: no debe cambiar de módulo
  await page.evaluate(() => { location.hash = ''; });
  await page.waitForTimeout(250);
  await page.keyboard.press('Tab');
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  report.checks.skipLinkKeepsDashboard = await page.evaluate(() => document.querySelector('#view h1')?.textContent?.trim());

  // Modal: foco inicial, Escape y retorno de foco
  await page.locator('.navigation [data-page="dashboard"]').click();
  await page.waitForSelector('.quick-card');
  await page.locator('.quick-card[data-action="status"]').click();
  await page.waitForSelector('#overlay .modal');
  report.checks.modalOpen = await page.evaluate(() => ({
    dialog: !!document.querySelector('[role="dialog"][aria-modal="true"]'),
    focusInside: !!document.querySelector('#overlay')?.contains(document.activeElement),
    bodyLocked: document.body.classList.contains('modal-open'),
  }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  report.checks.modalClosed = await page.evaluate(() => ({
    closed: !document.querySelector('#overlay'),
    bodyUnlocked: !document.body.classList.contains('modal-open'),
    focusRestored: document.activeElement?.dataset?.action === 'status',
  }));

  // Contraste calculado de textos clave (AA normal >= 4.5)
  report.contrast = await page.evaluate(() => {
    const parse = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
    const lum = (rgb) => {
      const [r, g, b] = rgb.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (fg, bg) => {
      const a = lum(parse(fg)), b = lum(parse(bg));
      return +( (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) ).toFixed(2);
    };
    const bgOf = (el) => {
      let node = el;
      while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
        node = node.parentElement;
      }
      return 'rgb(255, 255, 255)';
    };
    const sample = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { text: el.textContent.trim().slice(0, 40), size: cs.fontSize, ratio: ratio(cs.color, bgOf(el)) };
    };
    return {
      statDesc: sample('.stat-desc'),
      recentTime: sample('.recent-item time'),
      muted: sample('.subtext'),
      navLabel: sample('.nav-label'),
      pill: sample('.pill'),
      btnPrimary: sample('.btn-primary'),
      body: sample('#view p'),
    };
  });

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})();
