-- 006_integridad_estado_titular.sql
-- Coherencia entre estado operativo y titular del locker:
--   * status = 'Asignado'  => debe existir person_name.
--   * status = 'Disponible' => no debe existir person_name.
--
-- Solo valida filas nuevas o modificadas; no toca los datos existentes.
-- Antes de aplicar, comprobar que no hay violaciones actuales:
--   SELECT COUNT(*) FROM lockers WHERE status='Asignado' AND TRIM(COALESCE(person_name,''))='';
--   SELECT COUNT(*) FROM lockers WHERE status='Disponible' AND TRIM(COALESCE(person_name,''))<>'';
-- Ambos deben devolver 0 (verificado el 20-nov-2026: 0 y 0).
--
-- Idempotente: DROP TRIGGER IF EXISTS antes de crear.
-- Reversible: DROP TRIGGER trg_lockers_coherence_insert;
--             DROP TRIGGER trg_lockers_coherence_update;
-- Requiere respaldo previo y autorización.

USE sirenis_locker_db;

DROP TRIGGER IF EXISTS trg_lockers_coherence_insert;
DROP TRIGGER IF EXISTS trg_lockers_coherence_update;

DELIMITER $$

CREATE TRIGGER trg_lockers_coherence_insert
BEFORE INSERT ON lockers
FOR EACH ROW
BEGIN
  IF NEW.status = 'Asignado' AND TRIM(COALESCE(NEW.person_name, '')) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un locker asignado requiere titular.';
  END IF;
  IF NEW.status = 'Disponible' AND TRIM(COALESCE(NEW.person_name, '')) <> '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un locker disponible no puede tener titular.';
  END IF;
END$$

CREATE TRIGGER trg_lockers_coherence_update
BEFORE UPDATE ON lockers
FOR EACH ROW
BEGIN
  IF NEW.status = 'Asignado' AND TRIM(COALESCE(NEW.person_name, '')) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un locker asignado requiere titular.';
  END IF;
  IF NEW.status = 'Disponible' AND TRIM(COALESCE(NEW.person_name, '')) <> '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un locker disponible no puede tener titular.';
  END IF;
END$$

DELIMITER ;
