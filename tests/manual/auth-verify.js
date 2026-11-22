// tests/manual/auth-verify.js
// Verificación real en Chrome (headless) mediante DevTools Protocol.
// Cubre las pantallas de acceso y registro rediseñadas.
//
// Requiere el servidor PHP activo en http://127.0.0.1:8000
//   Start-Process C:\xampp\php\php.exe -ArgumentList @('-S','127.0.0.1:8000','-t','public')
//
// Uso: node tests/manual/auth-verify.js

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8000';
const PORT = Number(process.env.CDP_PORT || 9334);
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
  const expectedPath = new URL(url).pathname;
  await cdp.send('Page.navigate', { url });
  await waitFor(async () => {
    const state = await evaluate(cdp, '({ ready: document.readyState, path: location.pathname })');
    return state.ready === 'complete' && state.path === expectedPath;
  });
  await waitBooted(cdp);
  await evaluate(cdp, 'document.fonts.ready.then(() => true)');
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
  const logo = q('.auth-brand-logo');
  const panel = q('.auth-panel');
  const submit = q('.auth-submit');
  const h1 = q('.auth-panel h1');
  const back = q('.auth-back');
  const tiles = [...document.querySelectorAll('.auth-tile')];
  const switchLink = q('.auth-switch a');
  const username = q('#username') || q('#display_name');
  return {
    title: document.title,
    h1: text(h1),
    h1Count: document.querySelectorAll('h1').length,
    intro: text(q('.auth-intro')),
    backText: text(back),
    backHref: back ? back.getAttribute('href') : null,
    backWidth: back ? Math.round(back.getBoundingClientRect().width) : 0,
    switchText: text(q('.auth-switch')),
    switchHref: switchLink ? switchLink.getAttribute('href') : null,
    logoLoaded: Boolean(logo && logo.complete && logo.naturalWidth > 0),
    logoNaturalWidth: logo ? logo.naturalWidth : 0,
    logoWidth: logo ? Math.round(logo.getBoundingClientRect().width) : 0,
    logoAlt: logo ? logo.getAttribute('alt') : null,
    fontFamily: css(document.body).fontFamily,
    robotoLoaded: document.fonts.check('16px Roboto'),
    bodyBg: css(document.body).backgroundImage,
    h1Color: css(h1) ? css(h1).color : null,
    panelBg: css(panel) ? css(panel).backgroundColor : null,
    panelRadius: css(panel) ? css(panel).borderRadius : null,
    submitBg: css(submit) ? css(submit).backgroundColor : null,
    submitColor: css(submit) ? css(submit).color : null,
    submitHeight: submit ? Math.round(submit.getBoundingClientRect().height) : 0,
    inputHeight: username ? Math.round(username.getBoundingClientRect().height) : 0,
    inputFontSize: username ? css(username).fontSize : null,
    csrfLength: q('input[name=csrf]') ? q('input[name=csrf]').value.length : 0,
    hasForm: Boolean(q('form.auth-form')),
    hasRestricted: Boolean(q('.auth-restricted')),
    hasPasswordToggle: Boolean(q('[data-toggle-password="password"]')),
    tiles: tiles.length,
    usedTiles: tiles.filter((tile) => tile.classList.contains('is-used')).length,
    teamRows: document.querySelectorAll('.auth-team-row').length,
    footer: text(q('.auth-panel-footer')),
    alert: text(q('.auth-alert')),
    isReady: document.documentElement.classList.contains('is-ready'),
    bootHidden: (() => {
      const boot = q('.boot');
      return !boot || boot.getAttribute('aria-hidden') === 'true' || css(boot).visibility === 'hidden';
    })(),
    motionCss: Boolean(q('link[href*="motion.css"]')),
    motionScript: Boolean(q('script[src*="motion.js"]')),
    revealCount: document.querySelectorAll('[data-reveal]').length,
    revealedCount: document.querySelectorAll('[data-reveal].is-revealed').length,
    unrevealedInView: [...document.querySelectorAll('[data-reveal]')].filter((el) => {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      return inView && !el.classList.contains('is-revealed');
    }).length,
    inlineStyles: document.querySelectorAll('[style]').length,
    brokenImages: [...document.images]
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
    imagesWithoutAlt: [...document.images].filter((img) => !img.hasAttribute('alt')).length,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    pathname: location.pathname,
    lang: document.documentElement.lang,
    overflowing: [...document.querySelectorAll('body *')]
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return { tag: el.tagName, cls: String(el.className).slice(0, 40), right: Math.round(rect.right), width: Math.round(rect.width) };
      })
      .filter((item) => item.right > window.innerWidth + 1)
      .slice(0, 8),
  };
})()`;

function authChecks(tag, data, screen) {
  const isLogin = screen === 'login';
  check(tag + ' · título de pestaña', isLogin ? /Iniciar sesión/.test(data.title) : /Crear usuario/.test(data.title), data.title);
  check(tag + ' · H1 único y correcto', data.h1Count === 1 && (isLogin ? data.h1 === 'Inicia sesión' : /Crea tu cuenta|Nuevo usuario/.test(data.h1 || '')), data.h1 + ' / ' + data.h1Count);
  check(tag + ' · logo oficial cargado', data.logoLoaded && data.logoNaturalWidth === 720, 'natural=' + data.logoNaturalWidth + ' visible=' + data.logoWidth + 'px');
  check(tag + ' · logo con texto alternativo', data.logoAlt === 'Grand Sirenis Locker App', data.logoAlt);
  check(tag + ' · Roboto cargada y aplicada', data.robotoLoaded && /Roboto/.test(data.fontFamily), data.fontFamily);
  check(tag + ' · fondo arena con degradados', /radial-gradient/.test(data.bodyBg) && /linear-gradient/.test(data.bodyBg), data.bodyBg.slice(0, 90));
  check(tag + ' · tarjeta blanca del formulario', data.panelBg === 'rgb(255, 255, 255)' && parseFloat(data.panelRadius) > 0, data.panelBg + ' / ' + data.panelRadius);
  check(tag + ' · título en tinta de marca', data.h1Color === 'rgb(43, 38, 32)', data.h1Color);
  check(tag + ' · botón dorado accesible', data.submitBg === 'rgb(143, 111, 40)' && data.submitColor === 'rgb(255, 255, 255)', data.submitBg + ' / ' + data.submitColor);
  check(tag + ' · área táctil del botón', data.submitHeight >= 44, data.submitHeight + 'px');
  check(tag + ' · enlace de regreso visible', data.backWidth > 0 && data.backHref === 'welcome.php' && /Volver a la portada/.test(data.backText || ''), (data.backText || '') + ' -> ' + data.backHref);
  check(tag + ' · sin imágenes rotas', data.brokenImages.length === 0, data.brokenImages.join(', '));
  check(tag + ' · imágenes con alt', data.imagesWithoutAlt === 0, data.imagesWithoutAlt + ' sin alt');
  check(tag + ' · sin estilos inline', data.inlineStyles === 0, data.inlineStyles + ' elementos');
  check(tag + ' · idioma declarado (es)', data.lang === 'es', data.lang);
  check(tag + ' · sin desbordamiento horizontal', data.scrollWidth <= data.innerWidth + 1 && data.bodyScrollWidth <= data.innerWidth + 1, 'scroll=' + data.scrollWidth + ' viewport=' + data.innerWidth + ' | fuera: ' + JSON.stringify(data.overflowing));
  check(tag + ' · pie de página presente', /Grand Sirenis Locker App/.test(data.footer || ''), data.footer);
  check(tag + ' · precarga retirada', data.isReady && data.bootHidden, 'isReady=' + data.isReady + ' bootHidden=' + data.bootHidden);
  check(tag + ' · motion.css y motion.js cargados', data.motionCss && data.motionScript, 'css=' + data.motionCss + ' js=' + data.motionScript);
  check(tag + ' · revelado de elementos visibles', data.revealCount > 0 && data.unrevealedInView === 0, 'reveal=' + data.revealCount + ' revelados=' + data.revealedCount + ' pendientes visibles=' + data.unrevealedInView);
  if (isLogin) {
    check(tag + ' · ilustración de lockers', data.tiles === 9 && data.usedTiles > 0, data.tiles + ' lockers, ' + data.usedTiles + ' asignados');
    check(tag + ' · enlace a registro', data.switchHref === 'register.php', data.switchHref);
    check(tag + ' · campo de usuario táctil', data.inputHeight >= 44, data.inputHeight + 'px');
    check(tag + ' · alternar contraseña disponible', data.hasPasswordToggle, String(data.hasPasswordToggle));
  } else {
    check(tag + ' · muestra formulario o estado restringido', data.hasForm || data.hasRestricted, 'form=' + data.hasForm + ' restricted=' + data.hasRestricted);
    check(tag + ' · enlace a acceso', data.switchHref === 'login.php' || data.switchHref === 'index.php', data.switchHref);
    check(tag + ' · bloque de roles', data.teamRows >= 1, data.teamRows + ' filas');
    if (data.hasForm) {
      check(tag + ' · campo táctil', data.inputHeight >= 44, data.inputHeight + 'px');
      check(tag + ' · token CSRF presente', data.csrfLength >= 20, data.csrfLength + ' caracteres');
    }
  }
  if (isLogin) check(tag + ' · token CSRF presente', data.csrfLength >= 20, data.csrfLength + ' caracteres');
}

async function main() {
  if (!fs.existsSync(CHROME)) throw new Error('Chrome no encontrado en ' + CHROME);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-auth-'));
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

    const targets = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
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
      (text.includes('Content Security Policy') || text.toLowerCase().includes('csp') ? cspErrors : jsErrors).push(text);
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

    // 1. Captura y comprobaciones en los cuatro tamaños exigidos.
    for (const viewport of VIEWPORTS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.w,
        height: viewport.h,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      });
      const tag = viewport.w + 'x' + viewport.h;

      for (const screen of ['login', 'register']) {
        jsErrors.length = 0;
        cspErrors.length = 0;
        requests.length = 0;

        await goto(cdp, BASE + '/' + screen + '.php');
        const data = await evaluate(cdp, SNAPSHOT);
        authChecks(tag + ' · ' + screen, data, screen);

        check(tag + ' · ' + screen + ' · sin errores JavaScript', jsErrors.length === 0, jsErrors.join(' | '));
        check(tag + ' · ' + screen + ' · sin errores CSP', cspErrors.length === 0, cspErrors.join(' | '));
        const external = requests.filter((url) => url && !url.startsWith(BASE) && !url.startsWith('data:'));
        check(tag + ' · ' + screen + ' · solo recursos locales', external.length === 0, external.join(', '));

        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(OUT_DIR, 'auth-' + screen + '-' + tag + '.png'), Buffer.from(shot.data, 'base64'));
      }
    }

    // 2. Interacciones reales del login (escritorio).
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
    await goto(cdp, BASE + '/login.php');

    const toggleBefore = await evaluate(cdp, "document.getElementById('password').type");
    await evaluate(cdp, "document.querySelector('[data-toggle-password=\\'password\\']').click(); true");
    const toggleAfter = await evaluate(
      cdp,
      "({ type: document.getElementById('password').type, text: document.querySelector('[data-toggle-password=\\'password\\']').textContent.trim(), pressed: document.querySelector('[data-toggle-password=\\'password\\']').getAttribute('aria-pressed') })"
    );
    await evaluate(cdp, "document.querySelector('[data-toggle-password=\\'password\\']').click(); true");
    const toggleBack = await evaluate(cdp, "document.getElementById('password').type");
    check('login · alternar contraseña', toggleBefore === 'password' && toggleAfter.type === 'text' && toggleAfter.text === 'Ocultar' && toggleAfter.pressed === 'true' && toggleBack === 'password', toggleBefore + ' -> ' + toggleAfter.type + ' (' + toggleAfter.text + ') -> ' + toggleBack);

    await evaluate(
      cdp,
      "(() => { const f = document.querySelector('form.auth-form'); f.querySelector('#username').value = 'prueba.csrf'; f.querySelector('#password').value = 'clave-invalida-123'; f.querySelector('input[name=csrf]').value = 'invalido'; f.querySelector('button[type=submit]').click(); return true; })()"
    );
    await waitFor(() => evaluate(cdp, "Boolean(document.querySelector('.auth-alert.error'))"));
    await sleep(300);
    const loginAlert = await evaluate(cdp, "({ path: location.pathname, alert: (document.querySelector('.auth-alert.error')?.textContent || '').replace(/\\s+/g, ' ').trim() })");
    check('login · rechazo CSRF inválido', loginAlert.path === '/login.php' && /venció/.test(loginAlert.alert), loginAlert.alert);

    await evaluate(cdp, "document.querySelector('.auth-back').click(); true");
    await waitFor(async () => (await evaluate(cdp, 'location.pathname')) === '/welcome.php');
    await sleep(250);
    const backState = await evaluate(cdp, '({ path: location.pathname, hasWelcome: Boolean(document.querySelector(".welcome-page")) })');
    check('login · volver a la portada', backState.path === '/welcome.php' && backState.hasWelcome, backState.path);

    // 3. Interacciones reales del registro (escritorio).
    await goto(cdp, BASE + '/register.php');
    const registerShape = await evaluate(cdp, "({ hasForm: Boolean(document.querySelector('form.auth-form')), hasRestricted: Boolean(document.querySelector('.auth-restricted')) })");
    if (registerShape.hasForm) {
      const match = await evaluate(
        cdp,
        `(() => {
          const p = document.getElementById('password');
          const c = document.getElementById('password_confirm');
          const fb = document.getElementById('password-match');
          p.value = 'clave-de-prueba-123';
          p.dispatchEvent(new Event('input', { bubbles: true }));
          c.value = 'clave-de-prueba-124';
          c.dispatchEvent(new Event('input', { bubbles: true }));
          const mismatch = { text: fb.textContent.trim(), valid: fb.classList.contains('is-valid'), invalid: fb.classList.contains('is-invalid') };
          c.value = 'clave-de-prueba-123';
          c.dispatchEvent(new Event('input', { bubbles: true }));
          const matched = { text: fb.textContent.trim(), valid: fb.classList.contains('is-valid'), invalid: fb.classList.contains('is-invalid') };
          return { mismatch, matched };
        })()`
      );
      check('register · aviso de contraseñas distintas', /no coinciden/i.test(match.mismatch.text) && match.mismatch.invalid && !match.mismatch.valid, JSON.stringify(match.mismatch));
      check('register · aviso de contraseñas iguales', /coinciden/i.test(match.matched.text) && match.matched.valid && !match.matched.invalid, JSON.stringify(match.matched));

      const confirmToggle = await evaluate(
        cdp,
        "(() => { const b = document.querySelector('[data-toggle-password=\\'password_confirm\\']'); const c = document.getElementById('password_confirm'); b.click(); const shown = c.type; b.click(); return { shown, hidden: c.type }; })()"
      );
      check('register · alternar confirmación', confirmToggle.shown === 'text' && confirmToggle.hidden === 'password', JSON.stringify(confirmToggle));

      await evaluate(
        cdp,
        "(() => { const f = document.querySelector('form.auth-form'); f.querySelector('#display_name').value = 'Prueba Local'; f.querySelector('#username').value = 'prueba.csrf'; const p = f.querySelector('#password'); const c = f.querySelector('#password_confirm'); p.value = 'clave-de-prueba-123'; c.value = 'clave-de-prueba-123'; if (f.querySelector('#role')) f.querySelector('#role').value = 'operador'; f.querySelector('input[name=csrf]').value = 'invalido'; f.querySelector('button[type=submit]').click(); return true; })()"
      );
      await waitFor(() => evaluate(cdp, "Boolean(document.querySelector('.auth-alert.error'))"));
      await sleep(300);
      const registerAlert = await evaluate(cdp, "({ path: location.pathname, alert: (document.querySelector('.auth-alert.error')?.textContent || '').replace(/\\s+/g, ' ').trim() })");
      check('register · rechazo CSRF inválido', registerAlert.path === '/register.php' && /venció/.test(registerAlert.alert), registerAlert.alert);
    } else {
      check('register · formulario interactivo disponible', false, 'La base ya tiene usuarios; se requiere sesión de administrador (bloqueado sin credenciales)');
    }

    await evaluate(cdp, "document.querySelector('.auth-back').click(); true");
    await waitFor(async () => (await evaluate(cdp, 'location.pathname')) === '/welcome.php');
    await sleep(250);
    const registerBackState = await evaluate(cdp, '({ path: location.pathname, hasWelcome: Boolean(document.querySelector(".welcome-page")) })');
    check('register · volver a la portada', registerBackState.path === '/welcome.php' && registerBackState.hasWelcome, registerBackState.path);

    // 4. Con sesión activa no se muestra el acceso (redirección al dashboard).
    await goto(cdp, BASE + '/login.php');
    const loginPath = await evaluate(cdp, 'location.pathname');
    check('login · sin sesión permanece en login.php', loginPath === '/login.php', loginPath);
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
  console.log('VERIFICACIÓN LOGIN + REGISTER');
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
