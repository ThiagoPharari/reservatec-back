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

            // NUEVA VALIDACIÓN: Verificar que el día no esté deshabilitado
            const fecha = new Date(reservaData.fecha);
            const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const diaSemana = diasSemana[fecha.getDay()];

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
                u.codigo as usuario_codigo,
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
                // Asumir que el admin_id es 1 por ahora (deberías obtenerlo del token del encargado)
                const [comentarioResult] = await connection.query(`
                    INSERT INTO Comentarios (id_admin, comentario) 
                    VALUES (1, ?)
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
}

module.exports = ReservationService;