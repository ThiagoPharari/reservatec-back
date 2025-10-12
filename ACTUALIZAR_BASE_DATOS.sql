-- ============================================================
-- SCRIPT DE ACTUALIZACIÓN PARA ReservaTec
-- Este script agrega las tablas y columnas necesarias para:
-- 1. Gestión de áreas (habilitar/deshabilitar, stock, descripciones)
-- 2. Control de días y horarios deshabilitados por área
-- ============================================================

USE ReservaTec;

-- ============================================================
-- PASO 1: AGREGAR COLUMNAS A LA TABLA AREAS
-- ============================================================
-- Agregar descripción, estado de habilitación y stock a las áreas
ALTER TABLE Areas 
ADD COLUMN descripcion TEXT AFTER nombre,
ADD COLUMN habilitada BOOLEAN DEFAULT TRUE AFTER descripcion,
ADD COLUMN stock INT DEFAULT 10 AFTER habilitada;

-- ============================================================
-- PASO 2: CREAR TABLA PARA DÍAS DESHABILITADOS POR ÁREA
-- ============================================================
CREATE TABLE Area_Dias_Deshabilitados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_area INT NOT NULL,
    dia_semana ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo') NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_area) REFERENCES Areas(id_area) ON DELETE CASCADE,
    UNIQUE KEY unique_area_dia (id_area, dia_semana)
);

-- ============================================================
-- PASO 3: CREAR TABLA PARA HORARIOS DESHABILITADOS POR ÁREA
-- ============================================================
CREATE TABLE Area_Horarios_Deshabilitados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_area INT NOT NULL,
    id_horario INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_area) REFERENCES Areas(id_area) ON DELETE CASCADE,
    FOREIGN KEY (id_horario) REFERENCES Horarios(id_horario) ON DELETE CASCADE,
    UNIQUE KEY unique_area_horario (id_area, id_horario)
);

-- ============================================================
-- PASO 4: ACTUALIZAR ÁREAS EXISTENTES CON VALORES POR DEFECTO
-- ============================================================
-- Establecer todas las áreas como habilitadas
UPDATE Areas SET habilitada = TRUE WHERE habilitada IS NULL;

-- Establecer stock predeterminado
UPDATE Areas SET stock = 10 WHERE stock IS NULL OR stock = 0;

-- ============================================================
-- PASO 5: AGREGAR DESCRIPCIONES A LAS ÁREAS EXISTENTES
-- ============================================================
UPDATE Areas SET descripcion = 'Cancha de fútbol principal. Campo completo con arcos y líneas demarcadas.' 
WHERE nombre = 'futbol-1' AND (descripcion IS NULL OR descripcion = '');

UPDATE Areas SET descripcion = 'Cancha de fútbol secundaria. Ideal para partidos de práctica y entrenamiento.' 
WHERE nombre = 'futbol-2' AND (descripcion IS NULL OR descripcion = '');

UPDATE Areas SET descripcion = 'Cancha de frontón. Paredes de concreto para juego de pelota vasca.' 
WHERE nombre = 'fronton' AND (descripcion IS NULL OR descripcion = '');

UPDATE Areas SET descripcion = 'Mesas de ping pong. Incluye raquetas y pelotas disponibles para préstamo.' 
WHERE nombre = 'pingpong' AND (descripcion IS NULL OR descripcion = '');

UPDATE Areas SET descripcion = 'Área de juegos recreativos. Espacio para ludo, ajedrez y otros juegos de mesa.' 
WHERE nombre = 'ludo' AND (descripcion IS NULL OR descripcion = '');

UPDATE Areas SET descripcion = 'Cancha multiusos. Configuración para vóley y básquet con líneas y tableros.' 
WHERE nombre = 'voley-basquet' AND (descripcion IS NULL OR descripcion = '');

-- ============================================================
-- PASO 6: DATOS DE EJEMPLO (OPCIONAL - PUEDES ELIMINAR ESTO)
-- ============================================================
-- Ejemplo: Deshabilitar 'futbol-2' los Lunes y Martes
-- Descomenta las siguientes líneas si quieres probar esta funcionalidad:

-- INSERT INTO Area_Dias_Deshabilitados (id_area, dia_semana) VALUES
-- (2, 'Lunes'),
-- (2, 'Martes');

-- Ejemplo: Deshabilitar 'futbol-2' en los primeros dos horarios (08:00-09:00 y 09:00-10:00)
-- Descomenta las siguientes líneas si quieres probar esta funcionalidad:

-- INSERT INTO Area_Horarios_Deshabilitados (id_area, id_horario) VALUES
-- (2, 1),
-- (2, 2);

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
-- Ejecuta estas consultas para verificar que todo se actualizó correctamente:

SELECT 'Estructura de tabla Areas:' as INFO;
DESCRIBE Areas;

SELECT 'Áreas actualizadas:' as INFO;
SELECT id_area, nombre, descripcion, habilitada, stock FROM Areas;

SELECT 'Tabla Area_Dias_Deshabilitados creada:' as INFO;
DESCRIBE Area_Dias_Deshabilitados;

SELECT 'Tabla Area_Horarios_Deshabilitados creada:' as INFO;
DESCRIBE Area_Horarios_Deshabilitados;

SELECT '¡Actualización completada exitosamente!' as RESULTADO;
