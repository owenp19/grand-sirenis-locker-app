#!/usr/bin/env node
/**
 * Genera public/assets/icons/lucide-sprite.svg a partir de lucide-static.
 * Solo incluye los iconos usados por la aplicación (sin runtime ni CDN).
 * Uso: npm run icons:build
 */
'use strict';

const fs = require('fs');
const path = require('path');

const icons = [
  'lock', 'layout-dashboard', 'boxes', 'users', 'history', 'triangle-alert',
  'user-plus', 'log-out', 'arrow-right', 'arrow-up-right', 'shield-check',
  'info', 'package-open', 'key-round', 'arrow-right-left', 'wrench', 'search',
  'chevron-left', 'chevron-right', 'x', 'check', 'download', 'plus',
  'refresh-cw', 'sparkles', 'circle-alert', 'box', 'filter', 'user', 'at-sign',
  'database', 'pencil', 'heart',
  'bell', 'calendar-days', 'clock', 'trending-up', 'trending-down',
  'circle-check', 'activity', 'chart-column', 'gauge',
];

const sourceDir = path.join(__dirname, '..', 'node_modules', 'lucide-static', 'icons');
// Versiones recientes de lucide-static distribuyen un único sprite.svg en vez
// de un archivo por icono. Se soportan ambos formatos.
const sourceSprite = path.join(__dirname, '..', 'node_modules', 'lucide-static', 'sprite.svg');
const targetDir = path.join(__dirname, '..', 'public', 'assets', 'icons');
const target = path.join(targetDir, 'lucide-sprite.svg');
const spriteMarkup = fs.existsSync(sourceSprite) ? fs.readFileSync(sourceSprite, 'utf8') : null;

function iconInner(name, depth = 0) {
  if (depth > 6) throw new Error(`Alias circular en icono: ${name}`);
  if (spriteMarkup) {
    const match = spriteMarkup.match(new RegExp(`<symbol[^>]*\\bid="${name}"[^>]*>([\\s\\S]*?)</symbol>`));
    if (!match) throw new Error(`Icono no encontrado en sprite: ${name}`);
    // lucide-static define algunos iconos como alias internos
    // (<symbol id="history"><use href="#rotate-ccw-clock"/></symbol>).
    // En un sprite externo esos <use> no resuelven, así que se inlinean.
    return match[1]
      .replace(/<use[^>]*\bhref="#([^"]+)"[^>]*\/?>(?:<\/use>)?/g, (_, alias) => iconInner(alias, depth + 1))
      .trim()
      .replace(/\n\s+/g, '\n  ');
  }
  const file = path.join(sourceDir, `${name}.svg`);
  if (!fs.existsSync(file)) throw new Error(`Icono no encontrado: ${name}`);
  return fs.readFileSync(file, 'utf8')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim();
}

const symbols = icons.map((name) => `<symbol id="${name}" viewBox="0 0 24 24">${iconInner(name)}</symbol>`);

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n${symbols.join('\n')}\n</svg>\n`;
fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(target, sprite, 'utf8');
console.log(`Sprite generado: ${path.relative(process.cwd(), target)} (${icons.length} iconos, ${Buffer.byteLength(sprite)} bytes)`);
