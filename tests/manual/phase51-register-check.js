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
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(BASE + '/login.php', { waitUntil: 'load' });
  await page.fill('#username', 'admin.e2e');
  await page.fill('#password', 'E2eAdmin!2026-Clave');
  await Promise.all([page.waitForURL(/index\.php/), page.click('button[type="submit"]')]);
  await page.waitForSelector('#view .stat-num');
  await page.goto(BASE + '/register.php', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/results/phase51-register-desktop.png' });

  await page.goto(BASE + '/offline.html', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const offline = await page.evaluate(() => ({
    font: getComputedStyle(document.body).fontFamily,
    color: getComputedStyle(document.body).color,
    icon: document.querySelector('.icon') ? document.querySelector('.icon').getBoundingClientRect().width : null,
  }));
  await page.screenshot({ path: 'tests/results/phase51-offline.png' });
  console.log(JSON.stringify({ errors, offline }, null, 2));
  await browser.close();
})();
