const db = require('../../database/connection');

class ReservationService {
    // Obtener todas las áreas deportivas
    async getAreas() {
        const [areas] = await db.query(`
            SELECT id_area, nombre 
            FROM Areas 
            ORDER BY nombre
        `);
        return areas;
    }

    // Obtener todos los horarios
    async getHorarios() {
        const [horarios] = await db.query(`
            SELECT id_horario, hora_inicio, hora_fin 
            FROM Horarios 
            ORDER BY hora_inicio
        `);
        return horarios;
    }

    // Obtener horarios disponibles para una fecha y área específica
    async getHorariosDisponibles(areaId, fecha) {
        const [horarios] = await db.query(`
            SELECT 
                h.id_horario,
                h.hora_inicio,
                h.hora_fin,
                CASE 
                    WHEN r.id_reserva IS NULL THEN true 
                    ELSE false 
                END as disponible
            FROM Horarios h
            LEFT JOIN Reservas r ON (
                r.id_horario = h.id_horario 
                AND r.id_area = ? 
                AND r.fecha = ? 
                AND r.estado IN ('pendiente', 'aceptado')
            )
            ORDER BY h.hora_inicio
        `, [areaId, fecha]);
        
        return horarios;
    }

    // Crear una nueva reserva
    async crearReserva(reservaData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Buscar el usuario por email y verificar que esté activo
            const [usuario] = await connection.query(
                'SELECT id_usuario, activo FROM Usuarios WHERE correo = ?',
                [reservaData.user_email]
            );

            if (usuario.length === 0) {
                throw new Error('Usuario no encontrado');
            }

            if (!usuario[0].activo) {
                throw new Error('No puedes crear reservas porque tu cuenta está suspendida. Contacta al encargado para más información.');
            }

            const userId = usuario[0].id_usuario;

            // NUEVA VALIDACIÓN: Verificar que el área esté habilitada
            const [area] = await connection.query(
                'SELECT habilitada FROM Areas WHERE id_area = ?',
                [reservaData.id_area]
            );

            if (area.length === 0) {
                throw new Error('Área no encontrada');
            }

            if (!area[0].habilitada) {
                throw new Error('El área deportiva no está disponible en este momento. Por favor, contacta al encargado.');
            }

            // VALIDACIÓN: No permitir reservas en sábados ni domingos
            const fecha = new Date(reservaData.fecha);
            const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const diaSemana = diasSemana[fecha.getDay()];
            const numeroDia = fecha.getDay();

            // Rechazar sábados (6) y domingos (0)
            if (numeroDia === 0 || numeroDia === 6) {
                throw new Error('No se permiten reservas los fines de semana (sábados y domingos). Por favor, selecciona un día entre lunes y viernes.');
            }

            // VALIDACIÓN: Verificar que el día no esté deshabilitado
            const [diaDeshabilitado] = await connection.query(`
                SELECT COUNT(*) as count 
                FROM Area_Dias_Deshabilitados 
                WHERE id_area = ? AND dia_semana = ?
            `, [reservaData.id_area, diaSemana]);

            if (diaDeshabilitado[0].count > 0) {
                throw new Error(`El área no está disponible los días ${diaSemana}. Por favor, selecciona otro día.`);
            }

            // NUEVA VALIDACIÓN: Verificar que el horario no esté deshabilitado
            const [horarioDeshabilitado] = await connection.query(`
                SELECT COUNT(*) as count 
                FROM Area_Horarios_Deshabilitados 
                WHERE id_area = ? AND id_horario = ?
            `, [reservaData.id_area, reservaData.id_horario]);

            if (horarioDeshabilitado[0].count > 0) {
                throw new Error('El horario seleccionado no está disponible para esta área. Por favor, selecciona otro horario.');
            }

            // Verificar que el horario esté disponible
            const [disponibilidad] = await connection.query(`
                SELECT COUNT(*) as reservas_existentes
                FROM Reservas 
                WHERE id_area = ? 
                AND id_horario = ? 
                AND fecha = ? 
                AND estado IN ('pendiente', 'aceptado')
            `, [reservaData.id_area, reservaData.id_horario, reservaData.fecha]);

            if (disponibilidad[0].reservas_existentes > 0) {
                throw new Error('El horario ya está reservado para esta fecha');
            }

            // Verificar que el usuario no tenga otra reserva en el mismo horario y fecha
            const [reservaUsuario] = await connection.query(`
                SELECT COUNT(*) as reservas_usuario
                FROM Reservas 
                WHERE id_usuario = ? 
                AND fecha = ? 
                AND id_horario = ?
                AND estado IN ('pendiente', 'aceptado')
            `, [userId, reservaData.fecha, reservaData.id_horario]);

            if (reservaUsuario[0].reservas_usuario > 0) {
                throw new Error('Ya tienes una reserva en este horario para esta fecha');
            }

            // Crear la reserva
            const [result] = await connection.query(`
                INSERT INTO Reservas (
                    id_usuario, 
                    id_area, 
                    id_horario, 
                    fecha, 
                    participantes, 
                    material, 
                    estado
                ) VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
            `, [
                userId,
                reservaData.id_area,
                reservaData.id_horario,
                reservaData.fecha,
                reservaData.participantes,
                reservaData.material || false
            ]);

            await connection.commit();
            return result.insertId;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Obtener reservas por estado
    async getReservasByEstado(estado) {
        const [reservas] = await db.query(`
            SELECT 
                r.id_reserva,
                r.id_usuario,
                r.id_area,
                r.id_horario,
                r.fecha,
                r.participantes,
                r.material,
                r.estado,
                c.comentario as comentario_encargado,
                u.nombre as usuario_nombre,
                u.apellido as usuario_apellido,
                u.dni as usuario_dni,
                a.nombre as area_nombre,
                h.hora_inicio as horario_inicio,
                h.hora_fin as horario_fin
            FROM Reservas r
            INNER JOIN Usuarios u ON r.id_usuario = u.id_usuario
            INNER JOIN Areas a ON r.id_area = a.id_area
            INNER JOIN Horarios h ON r.id_horario = h.id_horario
            LEFT JOIN Comentarios c ON r.id_comentario = c.id_comentario
            WHERE r.estado = ?
            ORDER BY r.fecha DESC, h.hora_inicio ASC
        `, [estado]);

        return reservas;
    }

    // Cambiar estado de una reserva
    async cambiarEstadoReserva(reservaId, nuevoEstado, comentario = null) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar que la reserva existe
            const [reserva] = await connection.query(
                'SELECT * FROM Reservas WHERE id_reserva = ?',
                [reservaId]
            );

            if (reserva.length === 0) {
                throw new Error('Reserva no encontrada');
            }

            // Si hay comentario, crear el comentario y asociarlo
            let comentarioId = null;
            if (comentario && comentario.trim() !== '') {
                // Insertar comentario sin id_admin (será NULL)
                // En el futuro se puede mejorar para obtener el id del encargado del token
                const [comentarioResult] = await connection.query(`
                    INSERT INTO Comentarios (id_admin, comentario) 
                    VALUES (NULL, ?)
                `, [comentario]);
                comentarioId = comentarioResult.insertId;
            }

            // Actualizar el estado y el comentario si existe
            await connection.query(`
                UPDATE Reservas 
                SET estado = ?${comentarioId ? ', id_comentario = ?' : ''}
                WHERE id_reserva = ?
            `, comentarioId ? [nuevoEstado, comentarioId, reservaId] : [nuevoEstado, reservaId]);

            await connection.commit();

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Obtener reservas de un usuario específico
    async getReservasByUsuario(userEmail) {
        const [reservas] = await db.query(`
            SELECT 
                r.id_reserva,
                r.id_usuario,
                r.id_area,
                r.id_horario,
                r.fecha,
                r.participantes,
                r.material,
                r.material_devuelto,
                r.fecha_devolucion,
                r.estado,
                c.comentario as comentario_encargado,
                a.nombre as area_nombre,
                h.hora_inicio as horario_inicio,
                h.hora_fin as horario_fin
            FROM Reservas r
            INNER JOIN Usuarios u ON r.id_usuario = u.id_usuario
            INNER JOIN Areas a ON r.id_area = a.id_area
            INNER JOIN Horarios h ON r.id_horario = h.id_horario
            LEFT JOIN Comentarios c ON r.id_comentario = c.id_comentario
            WHERE u.correo = ?
            ORDER BY r.fecha DESC, h.hora_inicio ASC
        `, [userEmail]);

        return reservas;
    }

    // Cancelar una reserva del usuario
    async cancelarReservaUsuario(reservaId, userEmail) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar que la reserva pertenece al usuario y está en estado pendiente
            const [reserva] = await connection.query(`
                SELECT r.* FROM Reservas r
                INNER JOIN Usuarios u ON r.id_usuario = u.id_usuario
                WHERE r.id_reserva = ? AND u.correo = ? AND r.estado = 'pendiente'
            `, [reservaId, userEmail]);

            if (reserva.length === 0) {
                throw new Error('Reserva no encontrada o no se puede cancelar');
            }

            // Actualizar el estado a cancelado
            await connection.query(`
                UPDATE Reservas 
                SET estado = 'cancelado'
                WHERE id_reserva = ?
            `, [reservaId]);

            await connection.commit();

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // ============================================================
    // NUEVAS FUNCIONALIDADES: Control de Devolución de Materiales
    // ============================================================

    // Marcar material como devuelto
    async marcarMaterialDevuelto(reservaId, devuelto, adminId = 1) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar que la reserva existe y tiene material
            const [reserva] = await connection.query(
                'SELECT * FROM Reservas WHERE id_reserva = ? AND material = TRUE',
                [reservaId]
            );

            if (reserva.length === 0) {
                throw new Error('Reserva no encontrada o no tiene material asignado');
            }

            // Actualizar estado de devolución
            await connection.query(`
                UPDATE Reservas 
                SET material_devuelto = ?, 
                    fecha_devolucion = NOW()
                WHERE id_reserva = ?
            `, [devuelto, reservaId]);

            await connection.commit();

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Marcar material como NO devuelto y suspender usuario (HU-6)
    async marcarMaterialNoDevuelto(reservaId, descripcion, adminId = 1) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Verificar que la reserva existe y tiene material
            const [reserva] = await connection.query(
                'SELECT r.*, u.nombre, u.apellido, u.correo FROM Reservas r INNER JOIN Usuarios u ON r.id_usuario = u.id_usuario WHERE r.id_reserva = ? AND r.material = TRUE',
                [reservaId]
            );

            if (reserva.length === 0) {
                throw new Error('Reserva no encontrada o no tiene material asignado');
            }

            const usuario = reserva[0];

            // 2. Marcar material como NO devuelto
            await connection.query(`
                UPDATE Reservas 
                SET material_devuelto = FALSE, 
                    fecha_devolucion = NOW()
                WHERE id_reserva = ?
            `, [reservaId]);

            // 3. Suspender al usuario (activo = 0)
            await connection.query(
                'UPDATE Usuarios SET activo = 0 WHERE id_usuario = ?',
                [usuario.id_usuario]
            );

            // 4. Verificar si el admin existe en la tabla Administradores
            const [adminExists] = await connection.query(
                'SELECT id_admin FROM Administradores WHERE id_admin = ?',
                [adminId]
            );

            const validAdminId = adminExists && adminExists.length > 0 ? adminId : null;

            // 5. Crear un reporte automático para registrar la sanción
            // El usuario podrá ver el motivo de la suspensión consultando sus reportes sancionados
            await connection.query(`
                INSERT INTO Reportes 
                (id_reserva, id_usuario_reporta, id_usuario_reportado, razon, descripcion, estado, fecha_reporte, fecha_revision, id_admin_revisa, comentario_admin)
                VALUES (?, ?, ?, 'Material no devuelto', ?, 'sancionado', NOW(), NOW(), ?, ?)
            `, [
                reservaId, 
                usuario.id_usuario, // El usuario reportado también es quien "reporta" (auto-reporte del sistema)
                usuario.id_usuario, 
                descripcion || 'Material deportivo no devuelto en la fecha establecida',
                validAdminId,
                descripcion || 'Usuario suspendido por no devolver material deportivo'
            ]);

            await connection.commit();

            return {
                success: true,
                message: `Usuario ${usuario.nombre} ${usuario.apellido} suspendido por no devolver material`,
                usuario: {
                    id: usuario.id_usuario,
                    nombre: `${usuario.nombre} ${usuario.apellido}`,
                    correo: usuario.correo
                }
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Obtener reservas con material (para encargado)
    async getReservasConMaterial(filtro = 'todas') {
        let whereClause = 'r.material = TRUE';
        
        if (filtro === 'pendientes') {
            whereClause += ' AND r.material_devuelto IS NULL AND r.estado = "aceptado"';
        } else if (filtro === 'devueltas') {
            whereClause += ' AND r.material_devuelto = TRUE';
        } else if (filtro === 'no_devueltas') {
            whereClause += ' AND r.material_devuelto = FALSE';
        }

        const [reservas] = await db.query(`
            SELECT 
                r.id_reserva,
                r.id_usuario,
                r.id_area,
                r.id_horario,
                r.fecha,
                r.participantes,
                r.material,
                r.material_devuelto,
                r.fecha_devolucion,
                r.estado,
                c.comentario as comentario_encargado,
                u.nombre as usuario_nombre,
                u.apellido as usuario_apellido,
                u.dni as usuario_dni,
                u.activo as usuario_activo,
                a.nombre as area_nombre,
                h.hora_inicio as horario_inicio,
                h.hora_fin as horario_fin
            FROM Reservas r
            INNER JOIN Usuarios u ON r.id_usuario = u.id_usuario
            INNER JOIN Areas a ON r.id_area = a.id_area
            INNER JOIN Horarios h ON r.id_horario = h.id_horario
            LEFT JOIN Comentarios c ON r.id_comentario = c.id_comentario
            WHERE ${whereClause}
            ORDER BY r.fecha DESC, h.hora_inicio ASC
        `);

        return reservas;
    }

    // Obtener historial de sanciones de un usuario
    async getSancionesUsuario(userId) {
        // Ahora obtenemos las sanciones desde la tabla Reportes
        const [sanciones] = await db.query(`
            SELECT 
                r.id_reporte,
                r.razon,
                r.descripcion,
                r.comentario_admin,
                r.fecha_revision as fecha_sancion,
                res.fecha as fecha_reserva,
                res.id_area,
                a.nombre as area_nombre,
                adm.nombre as admin_nombre,
                adm.apellido as admin_apellido
            FROM Reportes r
            LEFT JOIN Reservas res ON r.id_reserva = res.id_reserva
            LEFT JOIN Areas a ON res.id_area = a.id_area
            LEFT JOIN Administradores adm ON r.id_admin_revisa = adm.id_admin
            WHERE r.id_usuario_reportado = ? AND r.estado = 'sancionado'
            ORDER BY r.fecha_revision DESC
        `, [userId]);

        return sanciones;
    }

    // Levantar suspensión de usuario
    async levantarSuspension(userId, adminId = 1) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Activar usuario (cambiar activo de 0 a 1)
            await connection.query(
                'UPDATE Usuarios SET activo = 1 WHERE id_usuario = ?',
                [userId]
            );

            // Ya no necesitamos actualizar tabla Sanciones porque no existe
            // La información de las sanciones queda registrada en la tabla Reportes
            // con estado = 'sancionado'

            await connection.commit();

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = ReservationService;