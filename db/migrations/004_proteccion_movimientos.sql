-- 004_proteccion_movimientos.sql
-- Protege la bitácora de auditoría: movements no se puede modificar ni borrar.
-- La aplicación solo INSERTA movimientos (no UPDATE ni DELETE), por lo que
-- esta protección no afecta la operación normal.
--
-- Idempotente: DROP TRIGGER IF EXISTS antes de crear.
-- Reversible: DROP TRIGGER trg_movements_block_update; DROP TRIGGER trg_movements_block_delete;
-- Requiere respaldo previo (scripts/backup-database.ps1) y autorización.

USE sirenis_locker_db;

DROP TRIGGER IF EXISTS trg_movements_block_update;
DROP TRIGGER IF EXISTS trg_movements_block_delete;

DELIMITER $$

CREATE TRIGGER trg_movements_block_update
BEFORE UPDATE ON movements
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'La bitacora de movimientos es inmutable: no se permite UPDATE.';
END$$

CREATE TRIGGER trg_movements_block_delete
BEFORE DELETE ON movements
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'La bitacora de movimientos es inmutable: no se permite DELETE.';
END$$

DELIMITER ;
