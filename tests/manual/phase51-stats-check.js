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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/login.php', { waitUntil: 'load' });
  await page.fill('#username', 'admin.e2e');
  await page.fill('#password', 'E2eAdmin!2026-Clave');
  await Promise.all([page.waitForURL(/index\.php/), page.click('button[type="submit"]')]);
  await page.waitForSelector('#view .stat-num');
  await page.waitForTimeout(400);

  const info = await page.evaluate(() => {
    const stat = document.querySelector('.stat');
    const box = stat.querySelector('.stat-icon');
    const svg = box.querySelector('svg');
    const use = svg && svg.querySelector('use');
    const cs = getComputedStyle(box);
    const ss = svg && getComputedStyle(svg);
    return {
      boxClass: box.className,
      boxColor: cs.color,
      boxBg: cs.backgroundColor,
      svgClass: svg && svg.getAttribute('class'),
      svgStroke: ss && ss.stroke,
      svgSize: svg && [svg.getBoundingClientRect().width, svg.getBoundingClientRect().height],
      useHref: use && use.getAttribute('href'),
      useBBox: use && (() => { try { const b = use.getBBox(); return [Math.round(b.width), Math.round(b.height)]; } catch (e) { return 'err'; } })(),
      inner: svg && svg.outerHTML.slice(0, 220),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  const el = await page.$('.stats');
  await el.screenshot({ path: 'tests/results/phase51-stats-crop.png' });
  await browser.close();
})();
