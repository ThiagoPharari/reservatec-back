-- ==========================
-- INSERTAR USUARIO DE PRUEBA
-- ==========================
-- Asegúrate de que exista al menos una carrera
INSERT IGNORE INTO Usuarios (nombre, apellido, dni, codigo, id_carrera, correo, activo) VALUES
('Usuario', 'Demo', '12345678', 'EST001', 1, 'usuario@demo.com', true);

-- ==========================
-- INSERTAR ADMINISTRADOR DE PRUEBA
-- ==========================
INSERT IGNORE INTO Administradores (nombre, apellido, celular, correo) VALUES
('Encargado', 'Demo', '999888777', 'encargado@demo.com');