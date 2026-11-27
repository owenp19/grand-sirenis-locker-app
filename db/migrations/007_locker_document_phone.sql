-- Migración 002: campos documento y teléfono en lockers para el acta de asignación
-- Grand Sirenis San Andrés · Acta oficial de asignación de lockers
ALTER TABLE lockers ADD COLUMN document VARCHAR(30) NULL AFTER person_name;
ALTER TABLE lockers ADD COLUMN phone VARCHAR(30) NULL AFTER document;
