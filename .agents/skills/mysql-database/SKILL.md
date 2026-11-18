# Skill: mysql-database

**Nombre:** MySQL Database Architect  
**Ubicación:** `.agents/skills/mysql-database/SKILL.md`  
**Procedencia:** Skill personalizado creado para Grand Sirenis Locker App  
**Estado:** Instalado y configurado (Fase 2)  
**Versión:** 1.0.0

---

## Descripción

Arquitecto de base de datos MySQL/MariaDB para la aplicación Grand Sirenis Locker App. Su responsabilidad es analizar, diseñar y mantener el esquema relacional: tablas `users`, `lockers` y `movements`, integridad referencial, índices, consultas preparadas, transacciones, optimización SQL, migraciones, respaldos y recuperación.

Este skill se activa cuando el usuario solicita cambios en `db/`, consultas SQL, índices, migraciones o cualquier operación sobre la base de datos `hotel_lockers`.

**Regla crítica:** no ejecutar operaciones destructivas (`DROP`, `DELETE` sin `WHERE`, `TRUNCATE`, `ALTER` que borre datos) sin autorización expresa del usuario y sin respaldo previo.

---

## Esquema actual (documentado desde el código real)

### Tabla `users`
| Campo | Tipo | Nulo | Comentario |
|---|---|---|---|
| `id` | INT UNSIGNED | NO | PK, AUTO_INCREMENT |
| `username` | VARCHAR(60) | NO | UNIQUE |
| `display_name` | VARCHAR(120) | NO | |
| `password_hash` | VARCHAR(255) | NO | |
| `role` | ENUM('administrador','operador') | NO | DEFAULT 'administrador' |
| `last_login_at` | DATETIME | SÍ | |
| `created_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP |

### Tabla `lockers`
| Campo | Tipo | Nulo | Comentario |
|---|---|---|---|
| `id` | VARCHAR(12) | NO | PK (ej. `1-01`) |
| `block_no` | SMALLINT UNSIGNED | NO | |
| `locker_no` | SMALLINT UNSIGNED | NO | |
| `status` | ENUM('Disponible','Asignado','Sin llave','Dañado','Bloqueado','Ocupado','Revisión') | NO | |
| `person_name` | VARCHAR(160) | SÍ | |
| `department` | VARCHAR(120) | SÍ | |
| `supervisor` | VARCHAR(160) | SÍ | |
| `condition_label` | VARCHAR(120) | SÍ | |
| `assigned_date` | DATE | SÍ | |
| `source_date_raw` | VARCHAR(100) | SÍ | |
| `date_invalid` | TINYINT(1) | NO | DEFAULT 0 |
| `delivered_by` | VARCHAR(160) | SÍ | |
| `change_from` | VARCHAR(30) | SÍ | |
| `change_to` | VARCHAR(30) | SÍ | |
| `previous_owner` | VARCHAR(160) | SÍ | |
| `reason` | TEXT | SÍ | |
| `original_status` | VARCHAR(120) | SÍ | |
| `source_row` | INT UNSIGNED | SÍ | |
| `updated_at` | TIMESTAMP | NO | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
| Índices | `idx_status`, `idx_block`, `idx_person` | | |

### Tabla `movements`
| Campo | Tipo | Nulo | Comentario |
|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | PK, AUTO_INCREMENT |
| `action_name` | VARCHAR(40) | NO | |
| `locker_id` | VARCHAR(50) | NO | |
| `person_name` | VARCHAR(160) | SÍ | |
| `actor_id` | INT UNSIGNED | NO | FK → `users(id)` |
| `actor_name` | VARCHAR(120) | NO | |
| `detail` | TEXT | NO | |
| `snapshot_before` | JSON | SÍ | |
| `snapshot_after` | JSON | SÍ | |
| `created_at` | DATETIME | NO | DEFAULT CURRENT_TIMESTAMP |
| Índices | `idx_created`, `idx_locker`, FK `fk_movements_user` | | |

**Motor:** InnoDB, charset `utf8mb4`, collation `utf8mb4_unicode_ci`.

---

## Especialización

- Diseño relacional y normalización.
- Integridad referencial (claves foráneas, `ON DELETE`/`ON UPDATE` cuando aplique).
- Índices para consultas frecuentes (`status`, `block_no`, `person_name`, `created_at`, `locker_id`).
- Consultas preparadas (ya usadas en `api.php` y `bootstrap.php`).
- Transacciones para operaciones atómicas (ej. traslado de locker en `do_action`).
- Optimización SQL (`EXPLAIN`, evitar `SELECT *` en consultas calientes).
- Migraciones versionadas (`db/migrations/`).
- Respaldos y recuperación (`db/schema.sql`, `db/seed.sql`, export JSON de `api.php`).
- Concurrencia: `FOR UPDATE` y `GET_LOCK` ya usados en `api.php` para evitar doble asignación.
- Consistencia de datos: no almacenar datos redundantes.

---

## Reglas de trabajo

1. **Analizar la base de datos existente antes de modificarla.** Leer `db/schema.sql`, `db/seed.sql` y `db/migrations/001_roles_usuarios.sql`.
2. **Verificar asignaciones de lockers:** la lógica debe impedir asignaciones simultáneas incompatibles (ya implementado con `FOR UPDATE` y comprobación de `status='Disponible'` y `person_name` vacío).
3. **No ejecutar operaciones destructivas** sin autorización expresa y respaldo previo.
4. **Evitar almacenar datos redundantes.** Los snapshots JSON en `movements` son auditoría, no redundancia operativa.
5. **Documentar el esquema real** en `docs/DATABASE_SCHEMA.md` tras cualquier cambio.
6. Las migraciones deben ser ejecutables una sola vez y no perder datos (`001_roles_usuarios.sql` es el modelo).

---

## Condiciones de activación

- Se solicita crear, modificar o migrar tablas en `db/`.
- Se necesita añadir, cambiar o eliminar índices.
- Se reportan consultas lentas o problemas de concurrencia en lockers.
- Se requiere un respaldo o recuperación de la base de datos.
- Se necesita documentar el esquema de base de datos.

---

## Procedimientos de trabajo

1. Leer los archivos SQL de `db/` antes de proponer cambios.
2. Verificar con `EXPLAIN` las consultas críticas si hay reportes de lentitud.
3. Proponer migraciones en `db/migrations/` con nombres versionados (ej. `002_...`).
4. Ejecutar `schema.sql` solo en instalaciones nuevas; `seed.sql` solo una vez (`INSERT IGNORE`).
5. Crear respaldo SQL antes de cualquier migración sobre una base existente.
6. Registrar el cambio en `docs/SESSION_STATE.md`, `docs/CHANGELOG.md` y `docs/DATABASE_SCHEMA.md`.

---

## Recursos de referencia

- `db/schema.sql`
- `db/seed.sql`
- `db/migrations/001_roles_usuarios.sql`
- `public/api.php` (funciones `rows_lockers`, `rows_movements`, `get_lock`, `do_action`, `save_movement`)
- `docs/DIAGNOSTICO.md`

---

## Scripts auxiliares

Ninguno requerido en esta fase (los scripts de respaldo Windows los define el skill `windows-automation`).
