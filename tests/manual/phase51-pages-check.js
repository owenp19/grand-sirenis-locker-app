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
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('console: ' + m.text()); });

  await page.goto(BASE + '/login.php');
  await page.fill('#username', 'admin.e2e');
  await page.fill('#password', 'E2eAdmin!2026-Clave');
  await Promise.all([page.waitForURL(/index\.php/), page.click('button[type="submit"]')]);
  await page.waitForSelector('#view .stat-num');
  await page.waitForTimeout(400);
  const dash = await page.evaluate(() => ({
    quickIcons: [...document.querySelectorAll('.quick-icon svg')].length,
    quickGlyphs: document.querySelector('#view').textContent.includes('＋'),
    recentIcons: document.querySelectorAll('.recent-icon svg').length,
    noticeIcons: document.querySelectorAll('.notice svg').length,
    bars: document.querySelectorAll('.bar-part').length,
    barInline: document.querySelectorAll('.bar-part[style]').length,
  }));
  await page.locator('.activity-split').screenshot({ path: 'tests/results/phase51-dashboard-activity.png' });

  await page.click('.navigation [data-page="lockers"]');
  await page.waitForSelector('.pagination');
  const inv = await page.evaluate(() => ({
    pagerIcons: document.querySelectorAll('.pagination svg').length,
    rows: document.querySelectorAll('tbody tr').length,
    searchIcon: !!document.querySelector('.search-wrap svg'),
    glyph: document.querySelector('#view').textContent.includes('→'),
  }));
  await page.locator('.content').screenshot({ path: 'tests/results/phase51-inventory.png' });

  await page.click('.navigation [data-page="history"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/results/phase51-history.png' });

  await page.click('.navigation [data-page="issues"]');
  await page.waitForTimeout(300);
  const iss = await page.evaluate(() => ({
    issueIcons: document.querySelectorAll('.issue-icon svg').length,
    empty: document.querySelectorAll('.empty').length,
  }));
  await page.locator('.content').screenshot({ path: 'tests/results/phase51-issues.png' });

  console.log(JSON.stringify({ dash, inv, iss, errors }, null, 2));
  await browser.close();
})();
