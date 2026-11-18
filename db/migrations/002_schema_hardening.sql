-- 002_schema_hardening.sql
-- Endurecimiento del esquema de Grand Sirenis Locker App.
-- Añade unicidad lógica de locker (bloque + número) e índice de búsqueda
-- de movimientos por persona. No borra datos ni recrea tablas.
--
-- Uso: instalar/actualizar sobre una base hotel_lockers existente.
-- Idempotente: usa IF NOT EXISTS (soportado por MariaDB 10.4+).
-- Antes de ejecutar sobre datos reales: crear respaldo (scripts/backup-database.ps1).

USE hotel_lockers;

-- Evita dos lockers con el mismo bloque y número.
ALTER TABLE lockers
  ADD UNIQUE INDEX IF NOT EXISTS uk_block_locker (block_no, locker_no);

-- Acelera la búsqueda de movimientos por colaborador.
ALTER TABLE movements
  ADD INDEX IF NOT EXISTS idx_movements_person (person_name);
