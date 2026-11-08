-- TP3 - Gestión de vehículos, conductores y viajes
-- Definición de la base de datos y sus tablas

CREATE DATABASE IF NOT EXISTS tp3_transporte
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tp3_transporte;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash CHAR(60) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  marca VARCHAR(50) NOT NULL,
  modelo VARCHAR(50) NOT NULL,
  patente VARCHAR(10) NOT NULL,
  anio SMALLINT UNSIGNED NOT NULL,
  capacidad_carga DECIMAL(10,2) NOT NULL COMMENT 'Capacidad de carga en kg',
  PRIMARY KEY (id),
  UNIQUE KEY uq_vehiculos_patente (patente)
);

CREATE TABLE IF NOT EXISTS conductores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  apellido VARCHAR(50) NOT NULL,
  dni VARCHAR(8) NOT NULL,
  numero_licencia VARCHAR(20) NOT NULL,
  fecha_alta_licencia DATE NOT NULL,
  fecha_vencimiento_licencia DATE NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_conductores_dni (dni),
  UNIQUE KEY uq_conductores_licencia (numero_licencia)
);

CREATE TABLE IF NOT EXISTS viajes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehiculo_id INT UNSIGNED NOT NULL,
  conductor_id INT UNSIGNED NOT NULL,
  fecha_salida DATETIME NOT NULL,
  fecha_llegada DATETIME NOT NULL,
  origen VARCHAR(100) NOT NULL,
  destino VARCHAR(100) NOT NULL,
  kilometros DECIMAL(10,2) NOT NULL,
  observaciones VARCHAR(500) NULL,
  PRIMARY KEY (id),
  KEY idx_viajes_vehiculo (vehiculo_id),
  KEY idx_viajes_conductor (conductor_id),
  CONSTRAINT fk_viajes_vehiculo FOREIGN KEY (vehiculo_id)
    REFERENCES vehiculos (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_viajes_conductor FOREIGN KEY (conductor_id)
    REFERENCES conductores (id) ON UPDATE CASCADE ON DELETE RESTRICT
);
