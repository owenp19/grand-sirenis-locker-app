-- Solo para instalaciones que ya tenían la tabla users creada antes de login/register.
-- No borra usuarios, contraseñas, lockers ni movimientos.
-- Ejecutar UNA VEZ sobre la base sirenis_locker_db desde phpMyAdmin.
USE sirenis_locker_db;
ALTER TABLE users
  ADD COLUMN role ENUM('administrador', 'operador') NOT NULL DEFAULT 'administrador' AFTER password_hash;
