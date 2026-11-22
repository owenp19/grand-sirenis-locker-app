-- Lockers Hotel · MySQL 8 / MariaDB 10.4+
-- Crea un esquema propio sin borrar otros datos.
CREATE DATABASE IF NOT EXISTS sirenis_locker_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sirenis_locker_db;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('administrador', 'operador') NOT NULL DEFAULT 'operador',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lockers (
  id VARCHAR(12) NOT NULL PRIMARY KEY,
  block_no SMALLINT UNSIGNED NOT NULL,
  locker_no SMALLINT UNSIGNED NOT NULL,
  status ENUM('Disponible','Asignado','Sin llave','Dañado','Bloqueado','Ocupado','Revisión') NOT NULL,
  person_name VARCHAR(160) NULL,
  department VARCHAR(120) NULL,
  supervisor VARCHAR(160) NULL,
  condition_label VARCHAR(120) NULL,
  assigned_date DATE NULL,
  source_date_raw VARCHAR(100) NULL,
  date_invalid TINYINT(1) NOT NULL DEFAULT 0,
  delivered_by VARCHAR(160) NULL,
  change_from VARCHAR(30) NULL,
  change_to VARCHAR(30) NULL,
  previous_owner VARCHAR(160) NULL,
  reason TEXT NULL,
  original_status VARCHAR(120) NULL,
  source_row INT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_block (block_no),
  INDEX idx_person (person_name),
  UNIQUE KEY uk_block_locker (block_no, locker_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  action_name VARCHAR(40) NOT NULL,
  -- Texto libre a propósito: un traslado guarda "origen → destino".
  -- Por eso no lleva FOREIGN KEY a lockers(id).
  locker_id VARCHAR(50) NOT NULL,
  person_name VARCHAR(160) NULL,
  actor_id INT UNSIGNED NOT NULL,
  actor_name VARCHAR(120) NOT NULL,
  detail TEXT NOT NULL,
  snapshot_before JSON NULL,
  snapshot_after JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at),
  INDEX idx_locker (locker_id),
  INDEX idx_movements_person (person_name),
  CONSTRAINT fk_movements_user FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
