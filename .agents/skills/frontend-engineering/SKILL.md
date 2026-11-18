# Skill: frontend-engineering

**Nombre:** Frontend Engineering  
**Ubicación:** `.agents/skills/frontend-engineering/SKILL.md`  
**Procedencia:** Skill personalizado creado para Grand Sirenis Locker App  
**Estado:** Instalado y configurado (Fase 2)  
**Versión:** 1.0.0

---

## Descripción

Especialista en el frontend de la aplicación: HTML5 semántico, CSS3 moderno, JavaScript vanilla sin dependencias, Fetch API y async/await. Su responsabilidad es construir y mantener la capa de presentación y comportamiento de la aplicación, separando claramente estructura, presentación y lógica, sin duplicar código ni añadir dependencias injustificadas.

Este skill se activa cuando el usuario solicita crear o modificar páginas, estilos, scripts de interacción, validación de formularios, consumo de la API (`api.php`), o cualquier cambio en `public/assets/`.

---

## Especialización

- HTML5 semántico y accesible.
- CSS3 moderno: variables CSS, CSS Grid, Flexbox.
- JavaScript moderno (ES6+): módulos, `fetch`, `async/await`, manejo de eventos.
- Validación de formularios (cliente y servidor coordinados).
- Accesibilidad (etiquetas, `aria`, foco, contrastes).
- Optimización del DOM (reflujo mínimo, delegación de eventos, evitación de re-renders innecesarios).

---

## Reglas de trabajo

1. **No generar CSS duplicado.** Revisar `public/assets/css/app.css` y `auth.css` antes de añadir estilos; reutilizar variables existentes.
2. **No generar JavaScript innecesario.** Revisar `public/assets/js/app.js` y `auth.js` antes de crear nuevas funciones.
3. **No crear múltiples funciones que hagan lo mismo.** Si existe una función reutilizable, usarla en lugar de duplicar.
4. **No introducir dependencias sin justificación.** No añadir librerías de CDN, frameworks ni paquetes npm sin aprobación técnica demostrada.
5. **Priorizar código reutilizable, legible y eficiente.**
6. **Separar responsabilidades:** HTML = estructura, CSS = presentación, JS = comportamiento.
7. Todas las peticiones a `api.php` deben incluir el token CSRF (`X-CSRF-Token`) y usar `credentials: 'same-origin'`.
8. Manejo de errores de red y de sesión (401 → redirección a `login.php`).

---

## Condiciones de activación

- Se solicita crear o modificar una página HTML (`public/*.php`).
- Se solicita crear o modificar estilos CSS en `public/assets/css/`.
- Se solicita crear o modificar JavaScript en `public/assets/js/`.
- Se necesita validación de formularios o interacción con `api.php`.
- Se reportan problemas de accesibilidad o rendimiento del DOM.

---

## Procedimientos de trabajo

1. Leer el archivo correspondiente antes de editarlo (evitar duplicados).
2. Identificar si ya existe una función, estilo o componente reutilizable.
3. Realizar el cambio mínimo necesario.
4. Verificar que el cambio no rompa otras pantallas (navegación, login, registro, dashboard).
5. Ejecutar `php -l` sobre los archivos PHP modificados.
6. Registrar el cambio en `docs/SESSION_STATE.md` y `docs/CHANGELOG.md`.

---

## Recursos de referencia

- `public/assets/css/app.css`
- `public/assets/css/auth.css`
- `public/assets/js/app.js`
- `public/assets/js/auth.js`
- `public/api.php` (contrato de endpoints: `bootstrap`, `export`, acciones `assign`/`release`/`transfer`/`status`/`edit`/`reconcile`)
- `private/bootstrap.php` (función `csrf_token`, helpers `field`, `valid_date`, `respond`, `fail`)

---

## Scripts auxiliares

Ninguno requerido en esta fase.
