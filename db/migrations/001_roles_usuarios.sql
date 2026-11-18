-- Solo para instalaciones que ya tenían la tabla users creada antes de login/register.
-- No borra usuarios, contraseñas, lockers ni movimientos.
-- Ejecutar UNA VEZ sobre la base hotel_lockers desde phpMyAdmin.
USE hotel_lockers;
ALTER TABLE users
  ADD COLUMN role ENUM('administrador', 'operador') NOT NULL DEFAULT 'administrador' AFTER password_hash;
