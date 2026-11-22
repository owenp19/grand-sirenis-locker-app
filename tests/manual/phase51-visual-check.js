const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8004';
const chromePath = [
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean).find((p) => fs.existsSync(p));

(async () => {
  const browser = await chromium.launch({ executablePath: chromePath });
  const report = { console: [], pageErrors: [], failed: [], fontRequests: [], spriteRequests: [] };

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') report.console.push(m.type() + ': ' + m.text());
  });
  page.on('pageerror', (e) => report.pageErrors.push(e.message));
  page.on('requestfailed', (r) => report.failed.push(r.url() + ' -> ' + (r.failure() || {}).errorText));
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('.woff2')) report.fontRequests.push(r.status() + ' ' + u);
    if (u.includes('lucide-sprite.svg')) report.spriteRequests.push(r.status() + ' ' + u);
  });

  const t0 = Date.now();
  await page.goto(BASE + '/login.php', { waitUntil: 'load' });
  report.loginLoadMs = Date.now() - t0;

  report.fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      robotoLoaded: document.fonts.check('14px Roboto'),
      bodyFont: getComputedStyle(document.body).fontFamily,
      headingWeight: getComputedStyle(document.querySelector('h1, h2')).fontWeight,
      loadedFaces: [...document.fonts].map((f) => f.family + ' ' + f.weight + ' ' + f.status),
    };
  });

  report.icons = await page.evaluate(() => {
    const icons = [...document.querySelectorAll('svg.icon use')];
    return icons.slice(0, 6).map((use) => {
      const svg = use.ownerSVGElement;
      const box = svg.getBoundingClientRect();
      return { href: use.getAttribute('href'), w: Math.round(box.width), h: Math.round(box.height), stroke: getComputedStyle(svg).stroke };
    }).concat([{ total: icons.length }]);
  });

  await page.screenshot({ path: 'tests/results/phase51-login-desktop.png', fullPage: false });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'tests/results/phase51-login-mobile.png', fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.fill('#username', 'admin.e2e');
  await page.fill('#password', 'E2eAdmin!2026-Clave');
  await Promise.all([page.waitForURL(/index\.php/, { waitUntil: 'load' }), page.click('button[type="submit"]')]);
  await page.waitForSelector('#view .stat-num');
  await page.waitForTimeout(400);
  report.dashboard = await page.evaluate(() => ({
    h1: (document.querySelector('#view h1') || {}).textContent,
    stats: [...document.querySelectorAll('.stat-num')].map((n) => n.textContent),
    bodyFont: getComputedStyle(document.body).fontFamily,
    iconCount: document.querySelectorAll('svg.icon').length,
    inlineStyles: document.querySelectorAll('#view [style]').length,
    skeletonVisible: !!document.querySelector('.skeleton-page'),
  }));
  await page.screenshot({ path: 'tests/results/phase51-dashboard-desktop.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/results/phase51-dashboard-mobile.png', fullPage: false });
  report.horizontalOverflowMobile = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})();
