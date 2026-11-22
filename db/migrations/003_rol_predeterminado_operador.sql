-- 003_rol_predeterminado_operador.sql
-- Cambia el rol por defecto de users de 'administrador' a 'operador'.
-- Motivo: principio de menor privilegio. El primer administrador se crea de
-- forma explícita desde register.php (primera cuenta) y el resto de cuentas
-- reciben el rol indicado por el administrador que las crea.
--
-- Idempotente: MODIFY COLUMN puede repetirse sin error.
-- Reversible: ejecutar el mismo ALTER con DEFAULT 'administrador'.
-- No borra usuarios, contraseñas ni datos.

USE sirenis_locker_db;

ALTER TABLE users
  MODIFY COLUMN role ENUM('administrador','operador') NOT NULL DEFAULT 'operador';
