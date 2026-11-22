-- 005_privilegios_minimos.sql
-- Reduce privilegios del usuario de aplicación: la app nunca ejecuta DELETE.
-- Verificado en el código: no existe ningún DELETE en public/ ni private/.
--
-- IMPORTANTE: los GRANT/REVOKE requieren una cuenta administrativa (root local).
-- No ejecutar con owenpusey. No es una migración de esquema: es un cambio
-- de permisos y requiere autorización expresa antes de aplicarse.
--
-- Idempotente: REVOKE de un privilegio no concedido genera un aviso, no un error
-- en MariaDB; puede repetirse.
-- Reversible: GRANT DELETE ON sirenis_locker_db.* TO 'owenpusey'@'%';
--
-- Ajustar el host ('localhost' o '127.0.0.1') según SHOW GRANTS del usuario real.

-- Ejecutar como root:
-- REVOKE DELETE ON sirenis_locker_db.* FROM 'owenpusey'@'%';
-- REVOKE DELETE ON sirenis_locker_db.* FROM 'owenpusey'@'localhost';

-- Comprobación posterior (como root):
-- SHOW GRANTS FOR 'owenpusey'@'%';

-- Nota: la protección de la bitácora (004) impide DELETE sobre movements incluso
-- si en el futuro se volviera a conceder el privilegio.
