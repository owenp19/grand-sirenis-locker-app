# Esquema de base de datos — sirenis_locker_db

Esquema real documentado a partir de `db/schema.sql`, `db/seed.sql` y `db/migrations/001_roles_usuarios.sql`.
Motor: InnoDB. Charset: utf8mb4. Collation: utf8mb4_unicode_ci.

## Tabla `users`
| Campo | Tipo | Nulo | Clave | Comentario |
|---|---|---|---|---|
| `id` | INT UNSIGNED | NO | PRI, AUTO_INCREMENT | |
| `username` | VARCHAR(60) | NO | UNIQUE | |
| `display_name` | VARCHAR(120) | NO | | |
| `password_hash` | VARCHAR(255) | NO | | Hash de contraseña (`password_hash`) |
| `role` | ENUM('administrador','operador') | NO | | DEFAULT 'operador' |
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

Índices: `idx_status` (status), `idx_block` (block_no), `idx_person` (person_name), `uk_block_locker` UNIQUE (block_no, locker_no).  
`uk_block_locker` evita que existan dos lockers con el mismo bloque y número (defensa en profundidad ante errores de importación).

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

Índices: `idx_created` (created_at), `idx_locker` (locker_id), `idx_movements_person` (person_name).  
Clave foránea: `fk_movements_user` (`actor_id` → `users(id)`).

## Concurrencia, transacciones y trazabilidad
- Todas las operaciones que modifican lockers (`assign`, `release`, `transfer`, `status`, `edit`, `reconcile`) corren dentro de una transacción PDO (`beginTransaction` / `commit` / `rollBack`).
- Cada locker implicado se lee con `SELECT ... FOR UPDATE` antes de modificarse, lo que serializa asignaciones simultáneas del mismo locker o del último locker disponible.
- Cada movimiento guarda `snapshot_before` / `snapshot_after` (JSON) y el actor (`actor_id` → `users(id)`), formando una pista de auditoría inmutable desde la aplicación.
- La primera cuenta de administrador usa `GET_LOCK('lockerflow_first_user', 8)` para evitar doble creación simultánea.

## Migraciones
| Archivo | Propósito | Idempotente |
|---|---|---|
| `db/migrations/001_roles_usuarios.sql` | Añade columna `role` a `users` existentes | No (falla si `role` ya existe) |
| `db/migrations/002_schema_hardening.sql` | Añade `uk_block_locker` e `idx_movements_person` | Sí (`ADD INDEX IF NOT EXISTS`, MariaDB 10.4+) |
| `db/migrations/003_rol_predeterminado_operador.sql` | Cambia rol por defecto a `operador` | Sí (`MODIFY COLUMN`) |
| `db/migrations/004_proteccion_movimientos.sql` | Trigger: movements inmutable (no UPDATE/DELETE) | Sí (`DROP TRIGGER IF EXISTS`) |
| `db/migrations/005_privilegios_minimos.sql` | Privilegios mínimos del usuario de app | Sí (GRANT/REVOKE repetibles) |
| `db/migrations/006_integridad_estado_titular.sql` | Trigger: coherencia status/titular en lockers | Sí (`DROP TRIGGER IF EXISTS`) |

## Usuario de aplicación y privilegios
- La aplicación se conecta con `owenpusey`, nunca con `root`.
- Privilegios: `SELECT, INSERT, UPDATE, DELETE ON sirenis_locker_db.*` únicamente. Sin `CREATE`, `ALTER`, `DROP`, `GRANT` ni acceso a otras bases.
- La contraseña vive solo en `.env` (no versionado). Las migraciones y tareas administrativas se ejecutan aparte con la cuenta administradora de XAMPP.

## Datos reales vs. demostración
- `db/seed.sql` es el **baseline/demo** (156 lockers con estados de ejemplo). No son datos reales de colaboradores.
- La base local actual contiene 156 lockers del seed, 0 usuarios y 0 movimientos: es un entorno de desarrollo.
- `hotel_lockers_test` es una copia aislada para pruebas E2E; contiene un administrador y un operador sintéticos.

## Pruebas y respaldo
- Base de pruebas: `scripts/setup-test-db.ps1` recrea `hotel_lockers_test` desde `sirenis_locker_db` y concede privilegios mínimos al usuario de aplicación.
- Suite E2E: `scripts/run-e2e.ps1` (base aislada + PHP en puerto 8001 + Playwright).
- Respaldo: `scripts/backup-database.ps1` (usa `owenpusey`, `MYSQL_PWD`, `--single-transaction`; salida en `storage/backups/`).
- Restauración verificada en `sirenis_locker_db`: 156 lockers / 0 usuarios / 0 movimientos.

## Instalación
- Nueva: importar `db/schema.sql` (crea `sirenis_locker_db`), luego `db/seed.sql` (una sola vez).
- Actualización de base previa: aplicar en orden las migraciones de `db/migrations/` que falten; `002` es idempotente y no borra datos.
- Antes de migrar datos reales: `scripts/backup-database.ps1` (respaldo SQL previo).
