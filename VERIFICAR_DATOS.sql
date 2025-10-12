-- ============================================================
-- SCRIPT DE VERIFICACIÓN Y CORRECCIÓN DE DATOS
-- Verifica que las áreas y reservas tengan los nombres correctos
-- ============================================================

USE ReservaTec;

-- ============================================================
-- PASO 1: VERIFICAR DATOS ACTUALES DE ÁREAS
-- ============================================================
SELECT 'ÁREAS ACTUALES EN LA BASE DE DATOS:' as INFO;
SELECT id_area, nombre, descripcion FROM Areas ORDER BY id_area;

-- ============================================================
-- PASO 2: VERIFICAR RESERVAS Y SUS ÁREAS ASOCIADAS
-- ============================================================
SELECT 'RESERVAS Y SUS ÁREAS:' as INFO;
SELECT 
    r.id_reserva,
    r.id_area,
    a.nombre as area_nombre,
    r.fecha,
    r.estado,
    CONCAT(u.nombre, ' ', u.apellido) as usuario
FROM Reservas r
INNER JOIN Areas a ON r.id_area = a.id_area
INNER JOIN Usuarios u ON r.id_usuario = u.id_usuario
ORDER BY r.id_reserva DESC
LIMIT 20;

-- ============================================================
-- PASO 3: CORREGIR NOMBRES DE ÁREAS SI ES NECESARIO
-- ============================================================
-- Si tus áreas tienen nombres incorrectos, descomenta y ejecuta:

-- UPDATE Areas SET nombre = 'futbol-1' WHERE id_area = 1;
-- UPDATE Areas SET nombre = 'futbol-2' WHERE id_area = 2;
-- UPDATE Areas SET nombre = 'fronton' WHERE id_area = 3;
-- UPDATE Areas SET nombre = 'pingpong' WHERE id_area = 4;
-- UPDATE Areas SET nombre = 'ludo' WHERE id_area = 5;
-- UPDATE Areas SET nombre = 'voley-basquet' WHERE id_area = 6;

-- ============================================================
-- PASO 4: VERIFICAR QUE EL JOIN FUNCIONA CORRECTAMENTE
-- ============================================================
SELECT 'VERIFICACIÓN DE JOIN (Reservas con Áreas):' as INFO;
SELECT 
    r.id_reserva,
    r.id_area as 'ID Área en Reserva',
    a.id_area as 'ID Área en Tabla Areas',
    a.nombre as 'Nombre del Área',
    r.fecha,
    r.estado
FROM Reservas r
LEFT JOIN Areas a ON r.id_area = a.id_area
WHERE r.estado = 'pendiente'
ORDER BY r.id_reserva DESC;

SELECT '¡Verificación completada!' as RESULTADO;
