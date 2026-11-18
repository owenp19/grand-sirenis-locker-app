# Skill: clean-code-performance

**Nombre:** Clean Code & Performance  
**Ubicación:** `.agents/skills/clean-code-performance/SKILL.md`  
**Procedencia:** Skill personalizado creado para Grand Sirenis Locker App  
**Estado:** Instalado y configurado (Fase 2)  
**Versión:** 1.0.0

---

## Descripción

Especialista en calidad del código, rendimiento y mantenibilidad para la aplicación Grand Sirenis Locker App. Su responsabilidad es aplicar principios DRY, KISS, YAGNI y SOLID (cuando sea apropiado), refactorizar con cuidado, eliminar código muerto de forma controlada, analizar el rendimiento de consultas y reducir la complejidad.

Este skill se activa antes de crear cualquier componente, función o servicio, y cuando se solicita refactorización, optimización o revisión de calidad del código.

**Reglas críticas:**
- Está prohibido generar código innecesario.
- Antes de crear cualquier componente, función o servicio, revisar si ya existe algo reutilizable.
- No generar archivos vacíos ni estructuras artificialmente complejas.
- No realizar refactorizaciones masivas sin comprender sus consecuencias.
- Priorizar soluciones sencillas, profesionales y verificables.

---

## Principios aplicados

| Principio | Aplicación en el proyecto |
|---|---|
| DRY | No duplicar CSS, JS ni funciones PHP. Reutilizar helpers de `bootstrap.php`. |
| KISS | Soluciones simples: PHP puro, JS vanilla, CSS puro, sin frameworks. |
| YAGNI | No crear controladores, servicios ni carpetas que no tengan uso inmediato. |
| SOLID | Aplicar solo cuando aporte valor (ej. separación PDO singleton en `db()`). |
| Refactorización | Cambios pequeños y verificables; nunca masivos sin entender el impacto. |
| Eliminación de código muerto | Solo eliminar tras comprobar que no se usa en ninguna pantalla o endpoint. |

---

## Reglas de trabajo

1. **Reutilizar antes de crear:** revisar `public/assets/js/app.js`, `auth.js`, `assets/css/app.css`, `auth.css` y `private/bootstrap.php` antes de añadir código nuevo.
2. **No generar funciones duplicadas.** Si existe una función similar, usarla o refactorizarla.
3. **No crear archivos vacíos ni carpetas sin valor.**
4. **Optimización de consultas:** revisar `EXPLAIN` en consultas frecuentes (`rows_lockers`, `rows_movements`, `get_lock` con `FOR UPDATE`).
5. **Reducción de dependencias:** no añadir librerías externas sin justificación técnica demostrada.
6. **Control de complejidad:** funciones cortas, con una responsabilidad, nombres claros en inglés o español consistente con el código existente.
7. **Verificabilidad:** cada cambio debe poder validarse con `php -l` y, cuando aplique, con Playwright.

---

## Condiciones de activación

- Se va a crear un nuevo componente, función o servicio.
- Se solicita refactorizar código existente.
- Se reportan problemas de rendimiento o complejidad.
- Se detecta código duplicado o muerto.

---

## Procedimientos de trabajo

1. Explorar el código existente para identificar reutilizables.
2. Diseñar el cambio más simple que resuelva el problema.
3. Implementar sin duplicar lógica ni estilos.
4. Verificar sintaxis (`php -l`) y que no rompa pantallas existentes.
5. Registrar el cambio en `docs/SESSION_STATE.md` y `docs/CHANGELOG.md`.

---

## Recursos de referencia

- `private/bootstrap.php` (funciones reutilizables: `field`, `valid_date`, `csrf_token`, `current_user`, `respond`, `fail`)
- `public/assets/js/app.js` y `auth.js`
- `public/assets/css/app.css` y `auth.css`
- `public/api.php`
- `docs/DIAGNOSTICO.md`

---

## Scripts auxiliares

Ninguno requerido en esta fase.
