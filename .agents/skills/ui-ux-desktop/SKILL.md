# Skill: ui-ux-desktop

**Nombre:** UI/UX Desktop Engineer  
**Ubicación:** `.agents/skills/ui-ux-desktop/SKILL.md`  
**Procedencia:** Skill personalizado creado para Grand Sirenis Locker App  
**Estado:** Instalado y configurado (Fase 2)  
**Versión:** 1.0.0

---

## Descripción

Especialista en diseño de interfaces de escritorio (desktop-first) para aplicaciones web ligeras basadas en PHP/MySQL. Su responsabilidad es analizar, proponer y mantener la experiencia de usuario de pantallas administrativas, tableros, formularios, tablas de datos y filtros, preservando la identidad visual existente y respetando la accesibilidad (WCAG) y el diseño responsive.

Este skill se activa cuando el usuario solicita revisar, diseñar o modificar pantallas de la aplicación, componentes reutilizables, sistemas de diseño, tipografía, jerarquía visual, espaciados, colores o estados de interacción.

**Importante para esta primera ejecución:** solamente se instala y configura este skill. No se deben realizar rediseños ni modificaciones visuales en la aplicación hasta una segunda fase dedicada exclusivamente a UI/UX.

---

## Responsabilidades

1. Diseño de interfaces administrativas (dashboard, inventario, formularios, tablas de datos).
2. Investigación de referencias visuales modernas, sin copiar productos de terceros.
3. Experiencia de usuario basada en flujos reales de trabajo (asignar, liberar, trasladar, validar lockers).
4. Enfoque desktop-first con adaptación responsive para móviles y tabletas.
5. Definición y mantenimiento de un sistema de diseño (tokens de color, tipografía, espaciados, bordes).
6. Creación de componentes reutilizables (botones, inputs, modales, tablas, pills, badges, toasts).
7. Jerarquía visual clara y legible en pantallas con gran densidad de información.
8. Estados de interacción: hover, activo, deshabilitado, carga, error, éxito, vacío.
9. Accesibilidad: contraste, navegación por teclado, etiquetas `aria`, enfoque visible, reducción de movimiento.
10. Análisis visual de pantallas existentes mediante herramientas de navegador (Playwright, DevTools).
11. Preservación de la identidad visual actual cuando corresponda.

---

## Condiciones de activación

- El usuario solicita revisión o rediseño de pantallas de la aplicación.
- Se requiere crear o modificar componentes de interfaz (botones, formularios, tablas, modales).
- Se necesita definir o ajustar el sistema de diseño (colores, tipografía, espaciados).
- Se debe evaluar la experiencia de usuario de un flujo concreto (ej. asignación de locker).
- Se solicita verificación de accesibilidad o responsive.

---

## Procedimientos de trabajo

1. **Comprender el flujo real:** antes de proponer cambios, analizar pantallas existentes y el flujo de trabajo del usuario (qué hace, en qué orden, con qué datos).
2. **Revisar lo existente:** inspeccionar `public/assets/css/app.css`, `public/assets/css/auth.css`, `public/index.php`, `public/login.php`, `public/register.php` y `public/assets/js/app.js` para no duplicar estilos ni comportamientos.
3. **Investigar referencias externas** solo cuando resulte útil y exista acceso a Internet; nunca copiar productos ajenos.
4. **Proponer cambios pequeños y verificables:** modificar un componente o pantalla a la vez.
5. **Validar con Playwright:** toda modificación visual significativa debe revisarse mediante pruebas end-to-end en Chromium (capturas de pantalla, navegación, resoluciones).
6. **Preservar identidad visual:** no cambiar colores, tipografía ni estructura sin justificación técnica y sin consenso.
7. **Documentar cambios:** registrar en `docs/CHANGELOG.md` y `docs/SESSION_STATE.md` qué pantallas o componentes se tocaron.

---

## Reglas de calidad

- No generar CSS duplicado.
- No crear múltiples reglas que hagan lo mismo.
- Priorizar variables CSS existentes (`--navy`, `--teal`, `--ink`, etc.) antes de crear nuevos valores.
- Separar estructura (HTML), presentación (CSS) y comportamiento (JS).
- Diseñar desktop-first; las media queries solo para adaptar, no para reescribir.
- Garantizar contraste mínimo WCAG AA (4.5:1 texto normal, 3:1 texto grande).
- Todos los elementos interactivos deben ser operables por teclado y tener foco visible.
- Respetar `prefers-reduced-motion: reduce` (ya presente en `app.css`).
- No introducir dependencias externas (sin CDN, sin frameworks de UI).

---

## Recursos de referencia

- `public/assets/css/app.css` — tokens y estilos vigentes.
- `public/assets/css/auth.css` — estilos de autenticación.
- `public/index.php`, `public/login.php`, `public/register.php` — pantallas existentes.
- `public/assets/js/app.js` — comportamiento de la UI (modales, tablas, filtros).
- `docs/DIAGNOSTICO.md` — diagnóstico técnico de la Fase 1.

---

## Scripts auxiliares

Ninguno requerido en esta fase.
