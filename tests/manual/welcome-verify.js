// tests/manual/welcome-verify.js
// Verificación real en Chrome (headless) mediante DevTools Protocol.
// Alternativa local a Playwright, que no está instalado en este entorno.
//
// Requiere el servidor PHP activo en http://127.0.0.1:8000
//   Start-Process C:\xampp\php\php.exe -ArgumentList @('-S','127.0.0.1:8000','-t','public')
//
// Uso: node tests/manual/welcome-verify.js

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8000';
const PORT = Number(process.env.CDP_PORT || 9333);
const OUT_DIR = path.join(process.cwd(), 'tests', 'results');

const VIEWPORTS = [
  { w: 1920, h: 1080, mobile: false },
  { w: 1366, h: 768, mobile: false },
  { w: 768, h: 1024, mobile: true },
  { w: 390, h: 844, mobile: true },
];

const results = [];
let pass = 0;
let fail = 0;

function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  results.push({ name, ok, detail });
  if (ok) pass += 1;
  else fail += 1;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(fn, timeout = 25000, interval = 250) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (_) {
      /* reintenta */
    }
    await sleep(interval);
  }
  throw new Error('Tiempo de espera agotado');
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
        return;
      }
      if (msg.method) {
        const list = this.handlers.get(msg.method) || [];
        for (const handler of list) handler(msg.params);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
  }

  waitForEvent(method, timeout = 25000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Sin evento ' + method)), timeout);
      const handler = (params) => {
        clearTimeout(timer);
        const list = this.handlers.get(method) || [];
        this.handlers.set(method, list.filter((item) => item !== handler));
        resolve(params);
      };
      this.on(method, handler);
    });
  }
}

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error('Excepción al evaluar: ' + response.exceptionDetails.text);
  }
  return response.result.value;
}

async function waitBooted(cdp) {
  await waitFor(async () => {
    const state = await evaluate(
      cdp,
      `(() => {
        const boot = document.querySelector('.boot');
        return {
          ready: document.documentElement.classList.contains('is-ready'),
          bootGone: !boot || boot.getAttribute('aria-hidden') === 'true' || getComputedStyle(boot).visibility === 'hidden',
        };
      })()`
    );
    return state.ready && state.bootGone;
  });
}

async function goto(cdp, url) {
  const loaded = cdp.waitForEvent('Page.loadEventFired');
  await cdp.send('Page.navigate', { url });
  await loaded;
  await waitBooted(cdp);
  await evaluate(cdp, 'document.fonts.ready.then(() => true)');
  // Espera a que terminen las animaciones de entrada (las infinitas se ignoran).
  await evaluate(
    cdp,
    `Promise.race([
      Promise.all(
        document.getAnimations()
          .filter((a) => !a.effect || a.effect.getTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => null))
      ),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]).then(() => true)`
  );
  await waitFor(async () => {
    const pending = await evaluate(
      cdp,
      `[...document.querySelectorAll('[data-reveal]')].filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0 && !el.classList.contains('is-revealed');
      }).length`
    );
    return pending === 0;
  }, 8000);
  await sleep(450);
}

const SNAPSHOT = `(() => {
  const q = (sel) => document.querySelector(sel);
  const css = (el) => el ? getComputedStyle(el) : null;
  const text = (el) => el ? el.textContent.replace(/\\s+/g, ' ').trim() : null;
  const logo = q('.welcome-logo');
  const cta = q('.welcome-cta');
  const title = q('.welcome-title-brand');
  return {
    title: document.title,
    h1: text(q('#welcome-title')),
    lead: text(q('.welcome-lead')),
    note: text(q('.welcome-access-note')),
    ctaText: text(cta),
    ctaHref: cta ? cta.getAttribute('href') : null,
    ctaHeight: cta ? Math.round(cta.getBoundingClientRect().height) : 0,
    logoLoaded: Boolean(logo && logo.complete && logo.naturalWidth > 0),
    logoNaturalWidth: logo ? logo.naturalWidth : 0,
    logoWidth: logo ? Math.round(logo.getBoundingClientRect().width) : 0,
    fontFamily: css(document.body).fontFamily,
    robotoLoaded: document.fonts.check('16px Roboto'),
    backgroundImage: css(document.body).backgroundImage,
    titleColor: css(title) ? css(title).color : null,
    ctaBackground: css(cta) ? css(cta).backgroundColor : null,
    ctaColor: css(cta) ? css(cta).color : null,
    doors: document.querySelectorAll('.locker-door').length,
    usedDoors: document.querySelectorAll('.locker-door.is-used').length,
    brokenImages: [...document.images]
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
    inlineStyles: document.querySelectorAll('[style]').length,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    pathname: location.pathname,
    lang: document.documentElement.lang,
    h1Count: document.querySelectorAll('h1').length,
    logoAlt: logo ? logo.getAttribute('alt') : null,
    imagesWithoutAlt: [...document.images].filter((img) => !img.hasAttribute('alt')).length,
    hasSkipLink: Boolean(document.querySelector('.welcome-skip')),
    isReady: document.documentElement.classList.contains('is-ready'),
    bootHidden: (() => {
      const boot = document.querySelector('.boot');
      return !boot || boot.getAttribute('aria-hidden') === 'true' || css(boot).visibility === 'hidden';
    })(),
    motionCss: Boolean(document.querySelector('link[href*="motion.css"]')),
    motionScript: Boolean(document.querySelector('script[src*="motion.js"]')),
    revealCount: document.querySelectorAll('[data-reveal]').length,
    revealedCount: document.querySelectorAll('[data-reveal].is-revealed').length,
    unrevealedInView: [...document.querySelectorAll('[data-reveal]')].filter((el) => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      return inView && !el.classList.contains('is-revealed');
    }).length,
    overflowing: [...document.querySelectorAll('body *')]
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return { tag: el.tagName, cls: String(el.className).slice(0, 40), right: Math.round(rect.right), width: Math.round(rect.width) };
      })
      .filter((item) => item.right > window.innerWidth + 1)
      .slice(0, 8),
    boxInfo: (() => {
      const stage = document.querySelector('.welcome-stage');
      const before = getComputedStyle(stage, '::before');
      return {
        bodyOverflowX: getComputedStyle(document.body).overflowX,
        htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
        stageWidth: Math.round(stage.getBoundingClientRect().width),
        beforeWidth: before.width,
        beforeRight: before.right,
      };
    })(),
  };
})()`;

async function main() {
  if (!fs.existsSync(CHROME)) throw new Error('Chrome no encontrado en ' + CHROME);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-welcome-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      '--user-data-dir=' + userDataDir,
      '--remote-debugging-port=' + PORT,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let cdp;
  try {
    const version = await waitFor(async () => {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      return res.ok ? res.json() : null;
    });
    console.log('Chrome: ' + version.Browser);

    const targets = await (
      await fetch('http://127.0.0.1:' + PORT + '/json/list')
    ).json();
    const page = targets.find((target) => target.type === 'page');
    if (!page) throw new Error('No hay pestaña disponible');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    cdp = new CDP(ws);

    const jsErrors = [];
    const cspErrors = [];
    const requests = [];

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Network.enable');

    cdp.on('Runtime.exceptionThrown', (params) => {
      const detail = params.exceptionDetails;
      jsErrors.push(detail.exception?.description || detail.text || 'excepción');
    });
    cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.type !== 'error') return;
      const text = params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ');
      (text.includes('Content Security Policy') || text.toLowerCase().includes('csp')
        ? cspErrors
        : jsErrors
      ).push(text);
    });
    cdp.on('Log.entryAdded', (params) => {
      const entry = params.entry;
      if (entry.level !== 'error') return;
      const text = entry.text || '';
      (text.includes('Content Security Policy') ? cspErrors : jsErrors).push(text);
    });
    cdp.on('Network.requestWillBeSent', (params) => {
      requests.push(params.request.url);
    });

    // 1. Portada en cada tamaño exigido.
    for (const viewport of VIEWPORTS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.w,
        height: viewport.h,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      });
      jsErrors.length = 0;
      cspErrors.length = 0;
      requests.length = 0;

      await goto(cdp, BASE + '/welcome.php');
      const data = await evaluate(cdp, SNAPSHOT);
      const tag = viewport.w + 'x' + viewport.h;

      check(tag + ' · título de pestaña', /Bienvenido/.test(data.title) && /Grand Sirenis Locker App/.test(data.title), data.title);
      check(tag + ' · H1 correcto', data.h1 === 'Bienvenido a Grand Sirenis Locker App', data.h1);
      check(tag + ' · descripción', data.lead === 'Gestión inteligente, segura y eficiente de lockers.', data.lead);
      check(tag + ' · texto secundario', data.note === 'Acceso exclusivo para personal autorizado.', data.note);
      check(tag + ' · CTA "Iniciar sesión"', data.ctaText === 'Iniciar sesión' && data.ctaHref === 'login.php', data.ctaText + ' -> ' + data.ctaHref);
      check(tag + ' · logo oficial cargado', data.logoLoaded && data.logoNaturalWidth === 720, 'natural=' + data.logoNaturalWidth + ' visible=' + data.logoWidth + 'px');
      check(tag + ' · Roboto cargada y aplicada', data.robotoLoaded && /Roboto/.test(data.fontFamily), data.fontFamily);
      check(tag + ' · tema arena + oro', /radial-gradient/.test(data.backgroundImage) && data.titleColor === 'rgb(43, 38, 32)' && data.ctaBackground === 'rgb(143, 111, 40)', (data.titleColor || '') + ' / ' + (data.ctaBackground || ''));
      check(tag + ' · contraste CTA (texto blanco)', data.ctaColor === 'rgb(255, 255, 255)', data.ctaColor);
      check(tag + ' · ilustración de lockers', data.doors === 32 && data.usedDoors > 0, data.doors + ' puertas, ' + data.usedDoors + ' asignadas');
      check(tag + ' · sin imágenes rotas', data.brokenImages.length === 0, data.brokenImages.join(', '));
      check(tag + ' · sin desbordamiento horizontal', data.scrollWidth <= data.innerWidth + 1 && data.bodyScrollWidth <= data.innerWidth + 1, 'scroll=' + data.scrollWidth + ' viewport=' + data.innerWidth + ' | fuera: ' + JSON.stringify(data.overflowing) + ' | ' + JSON.stringify(data.boxInfo));
      check(tag + ' · área táctil del CTA', data.ctaHeight >= 44, data.ctaHeight + 'px');
      check(tag + ' · sin estilos inline', data.inlineStyles === 0, data.inlineStyles + ' elementos');
      check(tag + ' · idioma declarado (es)', data.lang === 'es', data.lang);
      check(tag + ' · un solo H1', data.h1Count === 1, data.h1Count + ' H1');
      check(tag + ' · logo con texto alternativo', data.logoAlt === 'Grand Sirenis Locker App', data.logoAlt);
      check(tag + ' · imágenes con alt', data.imagesWithoutAlt === 0, data.imagesWithoutAlt + ' sin alt');
      check(tag + ' · enlace de salto', data.hasSkipLink, String(data.hasSkipLink));
      check(tag + ' · precarga retirada', data.isReady && data.bootHidden, 'isReady=' + data.isReady + ' bootHidden=' + data.bootHidden);
      check(tag + ' · motion.css y motion.js cargados', data.motionCss && data.motionScript, 'css=' + data.motionCss + ' js=' + data.motionScript);
      check(tag + ' · revelado de elementos visibles', data.revealCount > 0 && data.unrevealedInView === 0, 'reveal=' + data.revealCount + ' revelados=' + data.revealedCount + ' pendientes visibles=' + data.unrevealedInView);
      check(tag + ' · sin errores JavaScript', jsErrors.length === 0, jsErrors.join(' | '));
      check(tag + ' · sin errores CSP', cspErrors.length === 0, cspErrors.join(' | '));
      const external = requests.filter((url) => url && !url.startsWith(BASE) && !url.startsWith('data:'));
      check(tag + ' · solo recursos locales', external.length === 0, external.join(', '));

      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT_DIR, 'welcome-' + tag + '.png'), Buffer.from(shot.data, 'base64'));
    }

    // 2. Navegación real del CTA hacia el login.
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
    await goto(cdp, BASE + '/welcome.php');
    const landed = cdp.waitForEvent('Page.loadEventFired');
    await evaluate(cdp, "document.querySelector('.welcome-cta').click(); true");
    await landed;
    await waitBooted(cdp);
    await sleep(450);
    const loginState = await evaluate(
      cdp,
      '({ path: location.pathname, hasForm: Boolean(document.querySelector("form.auth-form")), title: document.title })'
    );
    check('navegación CTA -> login.php', loginState.path === '/login.php' && loginState.hasForm, loginState.path + ' / form=' + loginState.hasForm);

    const loginShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT_DIR, 'welcome-to-login.png'), Buffer.from(loginShot.data, 'base64'));

    // 3. La raíz del sitio entrega la portada (302 desde index.php).
    await goto(cdp, BASE + '/');
    const rootState = await evaluate(cdp, '({ path: location.pathname, hasWelcome: Boolean(document.querySelector(".welcome-page")) })');
    check('raíz del sitio -> welcome.php', rootState.path === '/welcome.php' && rootState.hasWelcome, rootState.path);
  } finally {
    if (cdp) {
      try {
        await cdp.send('Browser.close');
      } catch (_) {
        /* ignorado */
      }
    }
    await sleep(400);
    if (!chrome.killed) {
      spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' });
    }
    await sleep(400);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (_) {
      /* el perfil temporal puede quedar bloqueado brevemente */
    }
  }

  console.log('\n========================================');
  console.log('VERIFICACIÓN WELCOME PAGE');
  console.log('========================================');
  console.log('Correctas: ' + pass);
  console.log('Fallidas : ' + fail);
  console.log('========================================\n');
  for (const item of results) {
    if (!item.ok) console.log('  [FALLO] ' + item.name + ' — ' + item.detail);
  }
  console.log(fail === 0 ? 'Todas las comprobaciones pasaron.\n' : fail + ' comprobación(es) fallaron.\n');
  process.exitCode = fail === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('ERROR: ' + error.message);
  process.exitCode = 1;
});
