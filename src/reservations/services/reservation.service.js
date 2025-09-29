const db = require('../../database/connection');

class ReservationService {
    // Crear nueva reserva
    async createReservation(reservationData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            // Verificar que no exista una reserva conflictiva
            const [existingReservation] = await connection.query(
                'SELECT * FROM Reservas WHERE id_area = ? AND id_horario = ? AND fecha = ? AND estado IN ("pendiente", "aceptado")',
                [reservationData.id_area, reservationData.id_horario, reservationData.fecha]
            );

            if (existingReservation.length > 0) {
                throw new Error('Ya existe una reserva para esta área, horario y fecha');
            }

            // Verificar que el usuario existe
            const [user] = await connection.query(
                'SELECT * FROM Usuarios WHERE id_usuario = ? AND activo = true',
                [reservationData.id_usuario]
            );

            if (user.length === 0) {
                throw new Error('Usuario no encontrado o inactivo');
            }

            // Verificar que el área existe
            const [area] = await connection.query(
                'SELECT * FROM Areas WHERE id_area = ?',
                [reservationData.id_area]
            );

            if (area.length === 0) {
                throw new Error('Área deportiva no encontrada');
            }

            // Verificar que el horario existe
            const [horario] = await connection.query(
                'SELECT * FROM Horarios WHERE id_horario = ?',
                [reservationData.id_horario]
            );

            if (horario.length === 0) {
                throw new Error('Horario no encontrado');
            }

            // Insertar nueva reserva
            const [result] = await connection.query(
                'INSERT INTO Reservas (id_usuario, id_area, id_horario, fecha, participantes, material, estado, id_comentario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    reservationData.id_usuario,
                    reservationData.id_area,
                    reservationData.id_horario,
                    reservationData.fecha,
                    reservationData.participantes,
                    reservationData.material,
                    reservationData.estado,
                    reservationData.id_comentario
                ]
            );

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Obtener reservas por usuario
    async getReservationsByUser(userId) {
        const [reservations] = await db.query(`
            SELECT 
                r.*,
                a.nombre as area_nombre,
                h.hora_inicio,
                h.hora_fin,
                u.nombre as usuario_nombre,
                u.apellido as usuario_apellido,
                u.correo as usuario_correo,
                u.codigo as usuario_codigo,
                u.dni as usuario_dni
            FROM Reservas r
            JOIN Areas a ON r.id_area = a.id_area
            JOIN Horarios h ON r.id_horario = h.id_horario
            JOIN Usuarios u ON r.id_usuario = u.id_usuario
            WHERE r.id_usuario = ?
            ORDER BY r.fecha DESC, h.hora_inicio ASC
        `, [userId]);
        
        return reservations;
    }

    // Obtener reservas por estado
    async getReservationsByStatus(estado) {
        const [reservations] = await db.query(`
            SELECT 
                r.*,
                a.nombre as area_nombre,
                h.hora_inicio,
                h.hora_fin,
                u.nombre as usuario_nombre,
                u.apellido as usuario_apellido,
                u.correo as usuario_correo,
                u.codigo as usuario_codigo,
                u.dni as usuario_dni
            FROM Reservas r
            JOIN Areas a ON r.id_area = a.id_area
            JOIN Horarios h ON r.id_horario = h.id_horario
            JOIN Usuarios u ON r.id_usuario = u.id_usuario
            WHERE r.estado = ?
            ORDER BY r.fecha ASC, h.hora_inicio ASC
        `, [estado]);
        
        return reservations;
    }

    // Obtener reservas activas del día actual
    async getActiveReservationsToday() {
        const today = new Date().toISOString().split('T')[0];
        const [reservations] = await db.query(`
            SELECT 
                r.*,
                a.nombre as area_nombre,
                h.hora_inicio,
                h.hora_fin,
                u.nombre as usuario_nombre,
                u.apellido as usuario_apellido,
                u.correo as usuario_correo,
                u.codigo as usuario_codigo,
                u.dni as usuario_dni
            FROM Reservas r
            JOIN Areas a ON r.id_area = a.id_area
            JOIN Horarios h ON r.id_horario = h.id_horario
            JOIN Usuarios u ON r.id_usuario = u.id_usuario
            WHERE r.estado = 'aceptado' AND r.fecha = ?
            ORDER BY h.hora_inicio ASC
        `, [today]);
        
        return reservations;
    }

    // Actualizar estado de reserva
    async updateReservationStatus(reservationId, newStatus, comentarioId = null) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar que la reserva existe
            const [reservation] = await connection.query(
                'SELECT * FROM Reservas WHERE id_reserva = ?',
                [reservationId]
            );

            if (reservation.length === 0) {
                throw new Error('Reserva no encontrada');
            }

            // Actualizar estado
            const [result] = await connection.query(
                'UPDATE Reservas SET estado = ?, id_comentario = ? WHERE id_reserva = ?',
                [newStatus, comentarioId, reservationId]
            );

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Obtener todas las áreas disponibles
    async getAreas() {
        const [areas] = await db.query('SELECT * FROM Areas ORDER BY nombre');
        return areas;
    }

    // Obtener todos los horarios disponibles
    async getHorarios() {
        const [horarios] = await db.query('SELECT * FROM Horarios ORDER BY hora_inicio');
        return horarios;
    }

    // Verificar disponibilidad de horario
    async checkAvailability(areaId, horarioId, fecha) {
        const [reservations] = await db.query(
            'SELECT * FROM Reservas WHERE id_area = ? AND id_horario = ? AND fecha = ? AND estado IN ("pendiente", "aceptado")',
            [areaId, horarioId, fecha]
        );
        
        return reservations.length === 0;
    }

    // Obtener horarios disponibles para una fecha y área específica
    async getAvailableTimeSlots(areaId, fecha) {
        const [allHorarios] = await db.query('SELECT * FROM Horarios ORDER BY hora_inicio');
        const [reservedSlots] = await db.query(
            'SELECT id_horario FROM Reservas WHERE id_area = ? AND fecha = ? AND estado IN ("pendiente", "aceptado")',
            [areaId, fecha]
        );
        
        const reservedIds = reservedSlots.map(slot => slot.id_horario);
        const availableSlots = allHorarios.filter(horario => !reservedIds.includes(horario.id_horario));
        
        return availableSlots;
    }

    // Obtener reserva por ID
    async getReservationById(reservationId) {
        const [reservation] = await db.query(`
            SELECT 
                r.*,
                a.nombre as area_nombre,
                h.hora_inicio,
                h.hora_fin,
                u.nombre as usuario_nombre,
                u.apellido as usuario_apellido,
                u.correo as usuario_correo,
                u.codigo as usuario_codigo,
                u.dni as usuario_dni,
                c.comentario
            FROM Reservas r
            JOIN Areas a ON r.id_area = a.id_area
            JOIN Horarios h ON r.id_horario = h.id_horario
            JOIN Usuarios u ON r.id_usuario = u.id_usuario
            LEFT JOIN Comentarios c ON r.id_comentario = c.id_comentario
            WHERE r.id_reserva = ?
        `, [reservationId]);
        
        return reservation.length > 0 ? reservation[0] : null;
    }
}

module.exports = ReservationService;