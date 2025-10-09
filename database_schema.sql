-- Script SQL para crear las tablas del sistema de reservas ReservaTec
-- Ejecutar este script en MySQL para configurar la base de datos

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS reservatec;
USE reservatec;

-- Tabla de carreras (si no existe)
CREATE TABLE IF NOT EXISTS carreras (
    id_carrera INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de usuarios (ya existe, pero agregar columnas si no están)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Tabla de áreas deportivas
CREATE TABLE IF NOT EXISTS areas_deportivas (
    id_area INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    capacidad_maxima INT DEFAULT 20,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de horarios disponibles
CREATE TABLE IF NOT EXISTS horarios_disponibles (
    id_horario INT PRIMARY KEY AUTO_INCREMENT,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de reservas
CREATE TABLE IF NOT EXISTS reservas (
    id_reserva INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_area INT NOT NULL,
    id_horario INT NOT NULL,
    fecha DATE NOT NULL,
    participantes INT NOT NULL,
    material BOOLEAN DEFAULT false,
    estado ENUM('pendiente', 'aceptado', 'rechazado', 'cancelado') DEFAULT 'pendiente',
    comentario_encargado TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_area) REFERENCES areas_deportivas(id_area) ON DELETE CASCADE,
    FOREIGN KEY (id_horario) REFERENCES horarios_disponibles(id_horario) ON DELETE CASCADE,
    
    -- Índices para mejorar rendimiento
    INDEX idx_reservas_fecha (fecha),
    INDEX idx_reservas_estado (estado),
    INDEX idx_reservas_usuario (id_usuario),
    INDEX idx_reservas_area_fecha (id_area, fecha),
    
    -- Restricción única para evitar reservas duplicadas
    UNIQUE KEY unique_reserva (id_area, id_horario, fecha, estado)
);

-- Insertar datos iniciales de áreas deportivas
INSERT IGNORE INTO areas_deportivas (id_area, nombre, descripcion, capacidad_maxima) VALUES
(1, 'Fútbol 1', 'Cancha de fútbol principal', 22),
(2, 'Fútbol 2', 'Cancha de fútbol secundaria', 22),
(3, 'Frontón', 'Cancha de frontón', 4),
(4, 'Futsal/Vóley/Básket', 'Cancha multiusos para futsal, vóley y básquet', 12),
(5, 'Ludoteca', 'Espacio para actividades lúdicas', 15),
(6, 'Ping Pong', 'Mesa de ping pong', 4);

-- Insertar datos iniciales de horarios disponibles
INSERT IGNORE INTO horarios_disponibles (id_horario, hora_inicio, hora_fin) VALUES
(1, '08:00:00', '09:00:00'),
(2, '09:00:00', '10:00:00'),
(3, '10:00:00', '11:00:00'),
(4, '11:00:00', '12:00:00'),
(5, '14:00:00', '15:00:00'),
(6, '15:00:00', '16:00:00'),
(7, '16:00:00', '17:00:00'),
(8, '17:00:00', '18:00:00');

-- Insertar datos iniciales de carreras (si no existen)
INSERT IGNORE INTO carreras (id_carrera, nombre) VALUES
(1, 'Ingeniería de Sistemas'),
(2, 'Ingeniería Industrial'),
(3, 'Ingeniería Civil'),
(4, 'Administración'),
(5, 'Contabilidad'),
(6, 'Derecho'),
(7, 'Psicología'),
(8, 'Medicina'),
(9, 'Enfermería'),
(10, 'Otra');

-- Crear vista para consultas complejas de reservas
CREATE OR REPLACE VIEW vista_reservas_completa AS
SELECT 
    r.id_reserva,
    r.id_usuario,
    r.id_area,
    r.id_horario,
    r.fecha,
    r.participantes,
    r.material,
    r.estado,
    r.comentario_encargado,
    r.fecha_creacion,
    r.fecha_actualizacion,
    u.nombre as usuario_nombre,
    u.apellido as usuario_apellido,
    u.dni as usuario_dni,
    u.codigo as usuario_codigo,
    u.correo as usuario_correo,
    a.nombre as area_nombre,
    a.descripcion as area_descripcion,
    a.capacidad_maxima as area_capacidad,
    h.hora_inicio as horario_inicio,
    h.hora_fin as horario_fin,
    c.nombre as carrera_nombre
FROM reservas r
INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
INNER JOIN areas_deportivas a ON r.id_area = a.id_area
INNER JOIN horarios_disponibles h ON r.id_horario = h.id_horario
LEFT JOIN carreras c ON u.id_carrera = c.id_carrera;

-- Crear procedimiento almacenado para verificar disponibilidad
DELIMITER //
CREATE OR REPLACE PROCEDURE VerificarDisponibilidad(
    IN p_area_id INT,
    IN p_fecha DATE,
    IN p_horario_id INT
)
BEGIN
    SELECT 
        h.id_horario,
        h.hora_inicio,
        h.hora_fin,
        CASE 
            WHEN r.id_reserva IS NULL THEN 'DISPONIBLE'
            ELSE 'OCUPADO'
        END as disponibilidad,
        r.estado as estado_reserva
    FROM horarios_disponibles h
    LEFT JOIN reservas r ON (
        r.id_horario = h.id_horario 
        AND r.id_area = p_area_id 
        AND r.fecha = p_fecha 
        AND r.estado IN ('pendiente', 'aceptado')
    )
    WHERE h.id_horario = p_horario_id 
    AND h.activo = true;
END //
DELIMITER ;

-- Comentarios de documentación
/*
DESCRIPCIÓN DEL ESQUEMA:

1. areas_deportivas: Contiene las diferentes áreas donde se pueden hacer reservas
2. horarios_disponibles: Define los bloques de tiempo disponibles para reservas
3. reservas: Tabla principal que relaciona usuarios, áreas y horarios
4. usuarios: Tabla de usuarios del sistema (ya existente)
5. carreras: Catálogo de carreras universitarias

ESTADOS DE RESERVA:
- 'pendiente': Reserva creada por estudiante, esperando aprobación
- 'aceptado': Reserva aprobada por encargado
- 'rechazado': Reserva rechazada por encargado con comentario
- 'cancelado': Reserva cancelada por el usuario

INDICES:
- Se crearon índices en campos frecuentemente consultados
- Restricción única previene reservas duplicadas

VISTA:
- vista_reservas_completa: Simplifica consultas complejas con JOINs

PROCEDIMIENTO:
- VerificarDisponibilidad: Verifica si un horario está disponible
*/