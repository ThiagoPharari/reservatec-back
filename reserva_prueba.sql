-- Script para insertar datos de prueba de reservas
-- Esto permitirá visualizar estadísticas realistas

USE ReservaTec;

-- Asegurarse de que existan usuarios, áreas y horarios
-- (Deberían existir de scripts anteriores)

-- Insertar reservas de los últimos 6 meses
-- Mes actual (Octubre 2025)
INSERT INTO Reservas (id_usuario, id_area, id_horario, fecha, participantes, material, estado) VALUES
(1, 1, 3, '2025-10-07', 10, TRUE, 'aceptado'),
(2, 2, 4, '2025-10-08', 8, FALSE, 'aceptado'),
(1, 3, 5, '2025-10-09', 6, TRUE, 'pendiente'),
(3, 1, 2, '2025-10-10', 12, TRUE, 'aceptado'),
(2, 4, 6, '2025-10-11', 4, FALSE, 'aceptado');

-- Septiembre 2025
INSERT INTO Reservas (id_usuario, id_area, id_horario, fecha, participantes, material, estado) VALUES
(1, 1, 3, '2025-09-02', 10, TRUE, 'finalizado'),
(2, 2, 4, '2025-09-03', 8, FALSE, 'finalizado'),
(1, 1, 5, '2025-09-04', 10, TRUE, 'finalizado'),
(3, 3, 2, '2025-09-05', 6, TRUE, 'finalizado'),
(2, 1, 6, '2025-09-09', 12, TRUE, 'finalizado'),
(1, 2, 3, '2025-09-10', 8, FALSE, 'finalizado'),
(3, 4, 4, '2025-09-11', 4, FALSE, 'finalizado'),
(2, 1, 5, '2025-09-12', 10, TRUE, 'finalizado'),
(1, 3, 2, '2025-09-16', 6, TRUE, 'finalizado'),
(3, 1, 6, '2025-09-17', 12, TRUE, 'finalizado'),
(2, 2, 3, '2025-09-18', 8, FALSE, 'finalizado'),
(1, 5, 4, '2025-09-19', 5, FALSE, 'finalizado'),
(3, 1, 5, '2025-09-23', 10, TRUE, 'finalizado'),
(2, 3, 2, '2025-09-24', 6, TRUE, 'finalizado'),
(1, 1, 6, '2025-09-25', 12, TRUE, 'finalizado'),
(3, 2, 3, '2025-09-26', 8, FALSE, 'finalizado'),
(2, 4, 4, '2025-09-30', 4, FALSE, 'finalizado');

-- Agosto 2025
INSERT INTO Reservas (id_usuario, id_area, id_horario, fecha, participantes, material, estado) VALUES
(1, 1, 3, '2025-08-01', 10, TRUE, 'finalizado'),
(2, 2, 4, '2025-08-05', 8, FALSE, 'finalizado'),
(1, 1, 5, '2025-08-06', 10, TRUE, 'finalizado'),
(3, 3, 2, '2025-08-07', 6, TRUE, 'finalizado'),
(2, 1, 6, '2025-08-08', 12, TRUE, 'finalizado'),
(1, 2, 3, '2025-08-12', 8, FALSE, 'finalizado'),
(3, 4, 4, '2025-08-13', 4, FALSE, 'finalizado'),
(2, 1, 5, '2025-08-14', 10, TRUE, 'finalizado'),
(1, 3, 2, '2025-08-15', 6, TRUE, 'finalizado'),
(3, 1, 6, '2025-08-19', 12, TRUE, 'finalizado'),
(2, 2, 3, '2025-08-20', 8, FALSE, 'finalizado'),
(1, 5, 4, '2025-08-21', 5, FALSE, 'finalizado'),
(3, 1, 5, '2025-08-22', 10, TRUE, 'finalizado'),
(2, 3, 2, '2025-08-26', 6, TRUE, 'finalizado'),
(1, 1, 6, '2025-08-27', 12, TRUE, 'finalizado');

-- Julio 2025
INSERT INTO Reservas (id_usuario, id_area, id_horario, fecha, participantes, material, estado) VALUES
(1, 1, 3, '2025-07-01', 10, TRUE, 'finalizado'),
(2, 2, 4, '2025-07-02', 8, FALSE, 'finalizado'),
(1, 1, 5, '2025-07-03', 10, TRUE, 'finalizado'),
(3, 3, 2, '2025-07-07', 6, TRUE, 'finalizado'),
(2, 1, 6, '2025-07-08', 12, TRUE, 'finalizado'),
(1, 2, 3, '2025-07-09', 8, FALSE, 'finalizado'),
(3, 4, 4, '2025-07-10', 4, FALSE, 'finalizado'),
(2, 1, 5, '2025-07-14', 10, TRUE, 'finalizado'),
(1, 3, 2, '2025-07-15', 6, TRUE, 'finalizado'),
(3, 1, 6, '2025-07-16', 12, TRUE, 'finalizado'),
(2, 2, 3, '2025-07-17', 8, FALSE, 'finalizado'),
(1, 5, 4, '2025-07-21', 5, FALSE, 'finalizado'),
(3, 1, 5, '2025-07-22', 10, TRUE, 'finalizado'),
(2, 3, 2, '2025-07-23', 6, TRUE, 'finalizado');

-- Junio 2025
INSERT INTO Reservas (id_usuario, id_area, id_horario, fecha, participantes, material, estado) VALUES
(1, 1, 3, '2025-06-02', 10, TRUE, 'finalizado'),
(2, 2, 4, '2025-06-03', 8, FALSE, 'finalizado'),
(1, 1, 5, '2025-06-04', 10, TRUE, 'finalizado'),
(3, 3, 2, '2025-06-05', 6, TRUE, 'finalizado'),
(2, 1, 6, '2025-06-09', 12, TRUE, 'finalizado'),
(1, 2, 3, '2025-06-10', 8, FALSE, 'finalizado'),
(3, 4, 4, '2025-06-11', 4, FALSE, 'finalizado'),
(2, 1, 5, '2025-06-12', 10, TRUE, 'finalizado'),
(1, 3, 2, '2025-06-16', 6, TRUE, 'finalizado'),
(3, 1, 6, '2025-06-17', 12, TRUE, 'finalizado'),
(2, 2, 3, '2025-06-18', 8, FALSE, 'finalizado'),
(1, 5, 4, '2025-06-19', 5, FALSE, 'finalizado'),
(3, 1, 5, '2025-06-23', 10, TRUE, 'finalizado'),
(2, 3, 2, '2025-06-24', 6, TRUE, 'finalizado'),
(1, 1, 6, '2025-06-25', 12, TRUE, 'finalizado'),
(3, 2, 3, '2025-06-26', 8, FALSE, 'finalizado');

-- Mayo 2025
INSERT INTO Reservas (id_usuario, id_area, id_horario, fecha, participantes, material, estado) VALUES
(1, 1, 3, '2025-05-01', 10, TRUE, 'finalizado'),
(2, 2, 4, '2025-05-05', 8, FALSE, 'finalizado'),
(1, 1, 5, '2025-05-06', 10, TRUE, 'finalizado'),
(3, 3, 2, '2025-05-07', 6, TRUE, 'finalizado'),
(2, 1, 6, '2025-05-08', 12, TRUE, 'finalizado'),
(1, 2, 3, '2025-05-12', 8, FALSE, 'finalizado'),
(3, 4, 4, '2025-05-13', 4, FALSE, 'finalizado'),
(2, 1, 5, '2025-05-14', 10, TRUE, 'finalizado'),
(1, 3, 2, '2025-05-15', 6, TRUE, 'finalizado'),
(3, 1, 6, '2025-05-19', 12, TRUE, 'finalizado'),
(2, 2, 3, '2025-05-20', 8, FALSE, 'finalizado'),
(1, 5, 4, '2025-05-21', 5, FALSE, 'finalizado'),
(3, 1, 5, '2025-05-22', 10, TRUE, 'finalizado'),
(2, 3, 2, '2025-05-26', 6, TRUE, 'finalizado'),
(1, 1, 6, '2025-05-27', 12, TRUE, 'finalizado'),
(3, 2, 3, '2025-05-28', 8, FALSE, 'finalizado'),
(2, 4, 4, '2025-05-29', 4, FALSE, 'finalizado');

SELECT 'Datos de prueba de reservas insertados exitosamente' AS mensaje;
SELECT CONCAT('Total de reservas en el sistema: ', COUNT(*)) AS total FROM Reservas;
