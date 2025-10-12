-- Script SQL para agregar funcionalidad de gestión de áreas
-- Ejecutar después de crear la base de datos ReservaTec

USE ReservaTec;

-- Agregar columnas a la tabla Areas si no existen
ALTER TABLE Areas 
ADD COLUMN IF NOT EXISTS descripcion TEXT AFTER nombre,
ADD COLUMN IF NOT EXISTS habilitada BOOLEAN DEFAULT TRUE AFTER descripcion,
ADD COLUMN IF NOT EXISTS stock INT DEFAULT 10 AFTER habilitada;

-- Tabla para almacenar días deshabilitados por área
CREATE TABLE IF NOT EXISTS Area_Dias_Deshabilitados (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_area INT NOT NULL,
    dia_semana ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo') NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_area) REFERENCES Areas(id_area) ON DELETE CASCADE,
    UNIQUE KEY unique_area_dia (id_area, dia_semana)
);

-- Tabla para almacenar horarios deshabilitados por área
CREATE TABLE IF NOT EXISTS Area_Horarios_Deshabilitados (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_area INT NOT NULL,
    id_horario INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_area) REFERENCES Areas(id_area) ON DELETE CASCADE,
    FOREIGN KEY (id_horario) REFERENCES Horarios(id_horario) ON DELETE CASCADE,
    UNIQUE KEY unique_area_horario (id_area, id_horario)
);

-- Actualizar todas las áreas existentes para que estén habilitadas por defecto
UPDATE Areas SET habilitada = TRUE WHERE habilitada IS NULL;
UPDATE Areas SET stock = 10 WHERE stock IS NULL OR stock = 0;

-- Agregar descripciones a las áreas existentes (si no las tienen)
UPDATE Areas SET descripcion = 'Cancha de fútbol principal' WHERE id_area = 1 AND (descripcion IS NULL OR descripcion = '');
UPDATE Areas SET descripcion = 'Cancha de fútbol secundaria' WHERE id_area = 2 AND (descripcion IS NULL OR descripcion = '');
UPDATE Areas SET descripcion = 'Cancha de frontón' WHERE id_area = 3 AND (descripcion IS NULL OR descripcion = '');
UPDATE Areas SET descripcion = 'Mesas de ping pong' WHERE id_area = 4 AND (descripcion IS NULL OR descripcion = '');
UPDATE Areas SET descripcion = 'Área de juegos recreativos' WHERE id_area = 5 AND (descripcion IS NULL OR descripcion = '');
UPDATE Areas SET descripcion = 'Cancha multiusos' WHERE id_area = 6 AND (descripcion IS NULL OR descripcion = '');

-- Datos de ejemplo: Deshabilitar Fútbol 2 los lunes y martes
INSERT IGNORE INTO Area_Dias_Deshabilitados (id_area, dia_semana) VALUES
(2, 'Lunes'),
(2, 'Martes');

-- Datos de ejemplo: Deshabilitar Fútbol 2 en horarios 1 y 2 (primeros horarios de la mañana)
INSERT IGNORE INTO Area_Horarios_Deshabilitados (id_area, id_horario) VALUES
(2, 1),
(2, 2);

SELECT 'Tablas de gestión de áreas creadas exitosamente' AS mensaje;
SELECT CONCAT('Total de áreas en el sistema: ', COUNT(*)) AS total_areas FROM Areas;
SELECT CONCAT('Áreas habilitadas: ', COUNT(*)) AS areas_habilitadas FROM Areas WHERE habilitada = TRUE;

