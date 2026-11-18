# Skill: project-memory

**Nombre:** Persistent Project Memory  
**Ubicación:** `.agents/skills/project-memory/SKILL.md`  
**Procedencia:** Skill obligatorio para la continuidad del desarrollo  
**Estado:** Instalado y configurado (Fase 2); documentos en creación (Fase 4)  
**Versión:** 1.0.0

---

## Descripción

Skill obligatorio que conserva el contexto operativo del proyecto entre sesiones de desarrollo. Su función es crear y mantener la memoria persistente de Grand Sirenis Locker App para que cualquier sesión pueda continuar desde el estado real sin perder información técnica.

Este skill se activa al iniciar y al finalizar cada sesión de trabajo.

---

## Documentos de memoria persistente

| Documento | Ruta | Propósito |
|---|---|---|
| Instrucciones permanentes | `AGENTS.md` | Nombre, objetivo, tecnologías, arquitectura, convenciones, reglas de seguridad, calidad, testing, ubicación de skills, memoria persistente, restricciones destructivas |
| Contexto del proyecto | `docs/PROJECT_CONTEXT.md` | Resumen del negocio, dominio, flujos de trabajo, alcance y limitaciones |
| Arquitectura | `docs/ARCHITECTURE.md` | Estructura de capas, punto de entrada, conexión PHP↔MySQL, endpoints, PWA |
| Estado de sesión | `docs/SESSION_STATE.md` | Último estado registrado, archivos modificados, tareas pendientes, problemas abiertos, siguiente paso |
| Decisiones técnicas | `docs/DECISIONS.md` | Decisiones de diseño y arquitectura tomadas, con fecha y motivo |
| Backlog | `docs/BACKLOG.md` | Lista priorizada de tareas técnicas pendientes |
| Changelog | `docs/CHANGELOG.md` | Cambios relevantes por versión/fecha |
| Esquema de base de datos | `docs/DATABASE_SCHEMA.md` | Esquema real de `hotel_lockers` (tablas, campos, índices, relaciones) |
| Diagnóstico técnico | `docs/DIAGNOSTICO.md` | Resultado de la auditoría Fase 1 (ya creado) |

---

## Reglas de memoria

### Al iniciar una sesión
1. Leer `AGENTS.md`.
2. Leer el contexto del proyecto (`docs/PROJECT_CONTEXT.md`).
3. Recuperar el último estado registrado (`docs/SESSION_STATE.md`).
4. Revisar las decisiones técnicas (`docs/DECISIONS.md`).
5. Identificar las tareas pendientes (`docs/BACKLOG.md`).
6. Comprobar que la documentación coincida con el código fuente.
7. Continuar desde el estado real (el código fuente es la referencia definitiva).

### Al finalizar una tarea
1. Documentar los cambios relevantes.
2. Registrar los archivos modificados.
3. Actualizar las tareas terminadas.
4. Registrar problemas pendientes.
5. Documentar las pruebas ejecutadas (exitosas, fallidas, pendientes, bloqueadas).
6. Actualizar el siguiente paso recomendado.

---

## Reglas de contenido

- No llenar los documentos con información repetitiva.
- No almacenar contraseñas, tokens, datos personales ni conversaciones completas.
- No duplicar el contenido completo de los skills (estos permanecen en sus `SKILL.md`).
- Mantener los documentos breves y enfocados.
- El código fuente sigue siendo la referencia definitiva sobre el estado implementado.

---

## Condiciones de activación

- Al iniciar cualquier sesión de trabajo con el proyecto.
- Al finalizar una tarea o cambio relevante.
- Cuando se necesite recuperar contexto tras una interrupción.

---

## Procedimientos de trabajo

1. Al iniciar: leer los documentos en orden y validar que el estado descrito coincida con los archivos reales.
2. Durante el trabajo: anotar decisiones y archivos modificados en `docs/SESSION_STATE.md`.
3. Al terminar: actualizar `docs/CHANGELOG.md`, `docs/BACKLOG.md` y `docs/SESSION_STATE.md`.
4. Nunca commitear secretos ni datos reales en los documentos de memoria.

---

## Recursos de referencia

- `docs/DIAGNOSTICO.md` (estado inicial Fase 1)
- `.agents/skills/*/SKILL.md` (cada skill mantiene sus propias instrucciones)
- Código fuente en `public/`, `private/`, `db/`

---

## Scripts auxiliares

Ninguno requerido.
