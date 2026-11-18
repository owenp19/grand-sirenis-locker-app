# Skill: token-context-optimizer

**Nombre:** Token & Context Optimizer  
**Ubicación:** `.agents/skills/token-context-optimizer/SKILL.md`  
**Procedencia:** Skill personalizado creado para Grand Sirenis Locker App  
**Estado:** Instalado y configurado (Fase 1 de seguridad/optimización)  
**Versión:** 1.0.0

---

## Descripción

Aporta las capacidades operativas concretas que complementan las reglas de `AGENTS.md`: matriz de activación de skills, protocolo de presupuesto de contexto, orden de lectura progresiva y anti-patrones que desperdician tokens. No duplica las reglas de seguridad, calidad ni memoria; las aplica de forma eficiente.

Este skill se activa al **inicio de cada sesión** y antes de cualquier tarea que implique leer muchos archivos, analizar código grande o repetir operaciones ya hechas.

---

## Matriz de activación de skills (según tarea)

| Tarea | Skills a activar |
|---|---|
| Diseño/revisión de UI, pantallas, componentes | `ui-ux-desktop` (+ `frontend-engineering` si toca CSS/JS) |
| HTML/CSS/JS, formularios, fetch/API | `frontend-engineering` |
| Endpoints PHP, sesión, auth, validación | `php-backend` (+ `cybersecurity` si hay datos sensibles) |
| Esquema, consultas, índices, migraciones | `mysql-database` |
| Riesgos, secretos, CSRF/XSS/IDOR, exposición | `cybersecurity` |
| Pruebas E2E, navegador, screenshots | `playwright-testing` |
| Refactor, duplicación, rendimiento | `clean-code-performance` |
| Scripts PowerShell, entorno, respaldos | `windows-automation` |
| Inicio/fin de sesión, continuidad | `project-memory` |
| Siempre (meta) | `token-context-optimizer` |

Regla: activar solo los skills de la fila correspondiente; no cargar skills no usados.

---

## Protocolo de presupuesto de contexto

1. **Lectura base mínima (siempre):** `AGENTS.md` + `docs/SESSION_STATE.md`.
2. **Lectura dirigida:** solo los archivos que la tarea toca directamente.
3. **Búsqueda antes de lectura:** usar búsqueda (grep/glob) para localizar, y leer solo el fragmento relevante; no leer archivos completos si basta un rango.
4. **Reutilizar resultados:** no volver a leer un archivo ya leído en la misma sesión; recordar rutas, funciones y esquemas ya obtenidos.
5. **No repetir operaciones:** verificar estado (versiones, migraciones, skills, dependencias) antes de reinstalar o reejecutar.
6. **Salida breve:** informes técnicos concisos; no repetir documentación completa en el chat.

---

## Orden de lectura progresiva

1. `AGENTS.md` (reglas permanentes).
2. `docs/SESSION_STATE.md` (dónde quedó la sesión).
3. `docs/BACKLOG.md` y `docs/DECISIONS.md` (qué falta y por qué).
4. Archivos específicos de la tarea (código/SQL/docs).
5. Solo si es necesario, documentación de referencia externa.

---

## Anti-patrones (prohibidos)

- Leer todos los archivos del proyecto "por si acaso".
- Releer el mismo archivo sin cambios.
- Reinstalar skills/dependencias ya presentes.
- Regenerar el esquema o los datos cuando ya existen.
- Duplicar funciones, estilos, endpoints o documentos.
- Escribir informes largos con información ya conocida.
- Cargar skills irrelevantes para la tarea.

---

## Reglas de calidad

- Priorizar KISS/YAGNI: la solución más simple que cumpla la tarea.
- No generar código innecesario; reutilizar lo existente.
- Toda decisión debe ser verificable (comando, prueba o evidencia).
- No declarar pruebas no ejecutadas.

---

## Recursos de referencia

- `AGENTS.md` (secciones 5, 6, 9, 11, 12)
- `docs/SESSION_STATE.md`, `docs/BACKLOG.md`, `docs/DECISIONS.md`
- `.agents/skills/*/SKILL.md`
