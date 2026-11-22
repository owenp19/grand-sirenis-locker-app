// tests/manual/identity-verify.js
// Verificación estática de identidad visual sin Playwright.
// Comprueba que todos los archivos de imagen, CSS, JS, manifest y fuente existan y sean válidos.
// No requiere servidor PHP ni navegador.

'use strict';
const fs = require('fs');
const path = require('path');

const root = 'C:\\Users\\Owen\\Documents\\Sueños\\software-apps\\Grand-Sirenis-Locker-app';
const publicDir = path.join(root, 'public');

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  checks.push({ name, pass: condition, detail });
  if (condition) { passed++; } else { failed++; }
}

// 1. Imágenes renombradas existen en public/assets/image/
const imageDir = path.join(publicDir, 'assets', 'image');
const expectedImages = [
  'grand-sirenis-locker-app-favicon.png',
  'grand-sirenis-locker-app-logo-black.png',
  'grand-sirenis-locker-app-logo-black-720.png',
  'grand-sirenis-locker-app-logo-white.png',
  'grand-sirenis-locker-app-icon-windows.png',
];
for (const img of expectedImages) {
  const p = path.join(imageDir, img);
  check(`Imagen: ${img}`, fs.existsSync(p), fs.existsSync(p) ? '' : 'ARCHIVO FALTANTE');
}

// 2. Imágenes originales conservadas (recuperables)
const originalImages = [
  'Imagen de ChatGPT 18 nov 2026, 18_23_12-1.png',
  'Imagen de ChatGPT 18 nov 2026, 18_23_12-2.png',
  'Imagen de ChatGPT 18 nov 2026, 18_23_14-3.png',
  'Imagen de ChatGPT 18 nov 2026, 18_23_18-4.png',
];
for (const img of originalImages) {
  const p = path.join(imageDir, img);
  check(`Original conservado: ${img}`, fs.existsSync(p), fs.existsSync(p) ? '' : 'ARCHIVO FALTANTE');
}

// 3. Recursos PWA en public/icons/
const pwResources = ['icon.svg', 'icon-192.png', 'icon-512.png'];
for (const r of pwResources) {
  const p = path.join(publicDir, 'icons', r);
  check(`Recurso PWA: ${r}`, fs.existsSync(p), fs.existsSync(p) ? '' : 'ARCHIVO FALTANTE');
}

// 4. Fuente Roboto
const fonts = ['roboto-latin.woff2', 'roboto-latin-ext.woff2'];
for (const f of fonts) {
  const p = path.join(publicDir, 'assets', 'fonts', f);
  check(`Fuente: ${f}`, fs.existsSync(p), fs.existsSync(p) ? '' : 'ARCHIVO FALTANTE');
}

// 5. Manifest y service worker
const manifest = path.join(publicDir, 'manifest.webmanifest');
check('manifest.webmanifest existe', fs.existsSync(manifest));
if (fs.existsSync(manifest)) {
  const m = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  check('manifest.name = Grand Sirenis Locker App', m.name === 'Grand Sirenis Locker App', `valor: ${m.name}`);
  check('manifest.short_name = Sirenis Locker', m.short_name === 'Sirenis Locker', `valor: ${m.short_name}`);
  check('manifest tiene íconos 192 y 512', m.icons && m.icons.some(i => i.sizes === '192x192') && m.icons.some(i => i.sizes === '512x512'), `íconos: ${JSON.stringify(m.icons?.map(i => i.sizes))}`);
}

// 6. theme.css tiene tokens de marca
const themeCss = path.join(publicDir, 'assets', 'css', 'theme.css');
if (fs.existsSync(themeCss)) {
  const css = fs.readFileSync(themeCss, 'utf8');
  check('theme.css: --brand-gold definido', css.includes('--brand-gold: #A5832E'));
  check('theme.css: --brand-gold-light definido', css.includes('--brand-gold-light: #B9A867'));
  check('theme.css: --brand-secondary definido', css.includes('--brand-secondary: #BF8768'));
  check('theme.css: --brand-sand definido', css.includes('--brand-sand: #E7DFC9'));
  check('theme.css: --brand-taupe definido', css.includes('--brand-taupe: #5E584E'));
  check('theme.css: --color-primary definido', css.includes('--color-primary: var(--brand-gold)'));
  check('theme.css: --color-primary-soft definido', css.includes('--color-primary-soft: var(--brand-gold-light)'));
  check('theme.css: --color-secondary definido', css.includes('--color-secondary: var(--brand-secondary)'));
  check('theme.css: --focus-ring-primary definido', css.includes('--focus-ring-primary'));
  check('theme.css: --border-primary definido', css.includes('--border-primary'));
  check('theme.css: Roboto font-family', css.includes("font-family: 'Roboto'"));
}

// 7. Rutas de imagen en HTML/PHP
const htmlFiles = ['index.php', 'login.php', 'register.php', 'offline.html'];
for (const f of htmlFiles) {
  const p = path.join(publicDir, f);
  const content = fs.readFileSync(p, 'utf8');
  check(`${f}: favicon PNG referenciado`, content.includes('grand-sirenis-locker-app-favicon.png'), 'NO ENCONTRADO');
}

// 8. Logo negro en login y register
for (const f of ['login.php', 'register.php']) {
  const p = path.join(publicDir, f);
  const content = fs.readFileSync(p, 'utf8');
  check(`${f}: logo negro referenciado`, content.includes('grand-sirenis-locker-app-logo-black'), 'NO ENCONTRADO');
  check(`${f}: nombre de marca "Grand Sirenis Locker App"`, content.includes('Grand Sirenis Locker App'), 'NO ENCONTRADO');
}

// 9. index.php nombre de marca y footer
const indexContent = fs.readFileSync(path.join(publicDir, 'index.php'), 'utf8');
check('index.php: nombre de marca', indexContent.includes('Grand Sirenis Locker App'));
check('index.php: footer actualizado', indexContent.includes('Grand Sirenis Locker App · Sistema local de lockers'));

// 10. Comentarios JS/CSS actualizados
const appJs = fs.readFileSync(path.join(publicDir, 'assets', 'js', 'app.js'), 'utf8');
const authJs = fs.readFileSync(path.join(publicDir, 'assets', 'js', 'auth.js'), 'utf8');
const authCss = fs.readFileSync(path.join(publicDir, 'assets', 'css', 'auth.css'), 'utf8');
check('app.js: comentario actualizado', appJs.includes('Grand Sirenis Locker App · UI offline-ready'));
check('auth.js: comentario actualizado', authJs.includes('Grand Sirenis Locker App · Interacciones'));
check('auth.css: comentario actualizado', authCss.includes('Grand Sirenis Locker App · Acceso'));

// 11. sw.js caché actualizada y recursos de movimiento incluidos
const swJs = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
check('sw.js: caché renombrada', swJs.includes('grand-sirenis-locker-shell-v6'));
check('sw.js: motion.css en el shell', swJs.includes('./assets/css/motion.css'));
check('sw.js: motion.js en el shell', swJs.includes('./assets/js/motion.js'));
check('sw.js: estrategia red primero', /fetch\(req\)\s*\.then/.test(swJs));

// 11b. Precarga y movimiento presentes en las páginas
for (const page of ['welcome.php', 'login.php', 'register.php', 'index.php']) {
  const file = path.join(publicDir, page);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  check(`${page}: capa de precarga`, html.includes('class="boot"'));
  check(`${page}: motion.css`, html.includes('assets/css/motion.css'));
  check(`${page}: motion.js`, html.includes('assets/js/motion.js'));
}

// 12. package.json nombre actualizado
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
check('package.json: nombre = grand-sirenis-locker-app', pkg.name === 'grand-sirenis-locker-app', `valor: ${pkg.name}`);

// 13. Todos los PNG tienen transparencia (verificar colorType)
const pngFiles = expectedImages.map(i => path.join(imageDir, i));
for (const p of pngFiles) {
  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p);
    const colorType = buf[25];
    const hasAlpha = colorType === 6 || colorType === 4;
    const name = path.basename(p);
    check(`PNG ${name}: transparencia RGBA`, hasAlpha, `colorType=${colorType}`);
  }
}

// Resumen
console.log('\n========================================');
console.log('RESULTADO DE VERIFICACIÓN ESTÁTICA');
console.log('========================================');
console.log(`Pasaron: ${passed}`);
console.log(`Fallaron: ${failed}`);
console.log('========================================\n');

for (const c of checks) {
  if (!c.pass) {
    console.log(`  [FALLO] ${c.name} ${c.detail}`);
  }
}

if (failed > 0) {
  console.log(`\n${failed} prueba(s) fallaron.`);
  process.exit(1);
} else {
  console.log('Todas las verificaciones pasaron.\n');
}
