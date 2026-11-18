# Esquema de base de datos — hotel_lockers

Esquema real documentado a partir de `db/schema.sql`, `db/seed.sql` y `db/migrations/001_roles_usuarios.sql`.
Motor: InnoDB. Charset: utf8mb4. Collation: utf8mb4_unicode_ci.

## Tabla `users`
| Campo | Tipo | Nulo | Clave | Comentario |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | PRI, AUTO_INCREMENT | |
| `username` | VARCHAR(60) | NO | UNIQUE | |
| `display_name` | VARCHAR(120) | NO | | |
| `password_hash` | VARCHAR(255) | NO | | Hash de contraseña (`password_hash`) |
| `role` | ENUM('administrador','operador') | NO | | DEFAULT 'administrador' |
| `last_login_at` | DATETIME | SÍ | | |
| `created_at` | TIMESTAMP | NO | | DEFAULT CURRENT_TIMESTAMP |

## Tabla `lockers`
| Campo | Tipo | Nulo | Clave | Comentario |
|---|---|---|---|---|
| `id` | VARCHAR(12) | NO | PRI | Ej. `1-01` |
| `block_no` | SMALLINT UNSIGNED | NO | | |
| `locker_no` | SMALLINT UNSIGNED | NO | | |
| `status` | ENUM('Disponible','Asignado','Sin llave','Dañado','Bloqueado','Ocupado','Revisión') | NO | | |
| `person_name` | VARCHAR(160) | SÍ | | Titular asignado |
| `department` | VARCHAR(120) | SÍ | | |
| `supervisor` | VARCHAR(160) | SÍ | | Jefe inmediato |
| `condition_label` | VARCHAR(120) | SÍ | | Condición física |
| `assigned_date` | DATE | SÍ | | |
| `source_date_raw` | VARCHAR(100) | SÍ | | Fecha original del Excel |
| `date_invalid` | TINYINT(1) | NO | | DEFAULT 0 |
| `delivered_by` | VARCHAR(160) | SÍ | | |
| `change_from` | VARCHAR(30) | SÍ | | |
| `change_to` | VARCHAR(30) | SÍ | | |
| `previous_owner` | VARCHAR(160) | SÍ | | |
| `reason` | TEXT | SÍ | | |
| `original_status` | VARCHAR(120) | SÍ | | Estado original del Excel |
| `source_row` | INT UNSIGNED | SÍ | | Fila de origen en Excel |
| `updated_at` | TIMESTAMP | NO | | DEFAULT CURRENT_TIMESTAMP ON UPDATE |

Índices: `idx_status` (status), `idx_block` (block_no), `idx_person` (person_name).

## Tabla `movements`
| Campo | Tipo | Nulo | Clave | Comentario |
|---|---|---|---|---|
| `id` | BIGINT UNSIGNED | NO | PRI, AUTO_INCREMENT | |
| `action_name` | VARCHAR(40) | NO | | Tipo de acción |
| `locker_id` | VARCHAR(50) | NO | | |
| `person_name` | VARCHAR(160) | SÍ | | |
| `actor_id` | INT UNSIGNED | NO | MUL | FK → `users(id)` |
| `actor_name` | VARCHAR(120) | NO | | Nombre del responsable |
| `detail` | TEXT | NO | | Descripción del movimiento |
| `snapshot_before` | JSON | SÍ | | Estado antes (auditoría) |
| `snapshot_after` | JSON | SÍ | | Estado después (auditoría) |
| `created_at` | DATETIME | NO | | DEFAULT CURRENT_TIMESTAMP |

Índices: `idx_created` (created_at), `idx_locker` (locker_id).  
Clave foránea: `fk_movements_user` (`actor_id` → `users(id)`).

## Notas de integridad
- Las asignaciones de locker usan bloqueo `FOR UPDATE` en `api.php` para evitar asignaciones simultáneas incompatibles.
- La primera cuenta de administrador usa `GET_LOCK('lockerflow_first_user', 8)` para evitar doble creación simultánea.
- `seed.sql` usa `INSERT IGNORE` (no duplica si se reimporta).
- La migración `001_roles_usuarios.sql` añade la columna `role` sin borrar datos existentes.

## Instalación
- Nueva: importar `db/schema.sql`, luego `db/seed.sql` (una sola vez).
- Actualización de base previa: importar `db/migrations/001_roles_usuarios.sql` una sola vez (no repetir si da "Duplicate column name 'role'").
