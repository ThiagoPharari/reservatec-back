const db = require('../../database/connection');

class ReportService {
    // Crear un nuevo reporte (denuncia de usuario)
    async createReport(reportData) {
        const { id_reserva, id_usuario_reporta, razon, descripcion } = reportData;
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Obtener el usuario dueño de la reserva reportada
            const [reserva] = await connection.query(
                'SELECT id_usuario FROM reservas WHERE id_reserva = ?',
                [id_reserva]
            );

            if (!reserva || reserva.length === 0) {
                throw new Error('Reserva no encontrada');
            }

            const id_usuario_reportado = reserva[0].id_usuario;

            // No permitir que un usuario se reporte a sí mismo
            if (id_usuario_reporta === id_usuario_reportado) {
                throw new Error('No puedes reportar tu propia reserva');
            }

            // Insertar el reporte
            const [result] = await connection.query(
                `INSERT INTO Reportes 
                (id_reserva, id_usuario_reporta, id_usuario_reportado, razon, descripcion, estado, fecha_reporte)
                VALUES (?, ?, ?, ?, ?, 'pendiente', NOW())`,
                [id_reserva, id_usuario_reporta, id_usuario_reportado, razon, descripcion]
            );

            await connection.commit();

            return {
                id_reporte: result.insertId,
                message: 'Reporte creado exitosamente'
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Obtener todos los reportes (para encargado) con filtro opcional
    async getAllReports(filtro = 'pendiente') {
        const connection = await db.getConnection();
        try {
            let query = `
                SELECT 
                    r.id_reporte,
                    r.razon,
                    r.descripcion,
                    r.estado,
                    r.fecha_reporte,
                    r.fecha_revision,
                    r.comentario_admin,
                    
                    -- Datos del usuario que reporta
                    ur.nombre as reporta_nombre,
                    ur.apellido as reporta_apellido,
                    
                    -- Datos del usuario reportado
                    ure.nombre as reportado_nombre,
                    ure.apellido as reportado_apellido,
                    ure.dni as reportado_dni,
                    ure.activo as reportado_activo,
                    
                    -- Datos de la reserva
                    res.id_reserva,
                    res.fecha as reserva_fecha,
                    res.participantes,
                    res.estado as reserva_estado,
                    
                    -- Datos del área
                    a.nombre as area_nombre,
                    
                    -- Datos del horario
                    h.hora_inicio,
                    h.hora_fin,
                    
                    -- Admin que revisó
                    ad.nombre as admin_nombre,
                    ad.apellido as admin_apellido
                    
                FROM Reportes r
                INNER JOIN usuarios ur ON r.id_usuario_reporta = ur.id_usuario
                INNER JOIN usuarios ure ON r.id_usuario_reportado = ure.id_usuario
                INNER JOIN reservas res ON r.id_reserva = res.id_reserva
                INNER JOIN Areas a ON res.id_area = a.id_area
                INNER JOIN Horarios h ON res.id_horario = h.id_horario
                LEFT JOIN Administradores ad ON r.id_admin_revisa = ad.id_admin
            `;

            const params = [];

            if (filtro && filtro !== 'todas') {
                query += ' WHERE r.estado = ?';
                params.push(filtro);
            }

            query += ' ORDER BY r.fecha_reporte DESC';

            const [reportes] = await connection.query(query, params);

            return reportes;

        } finally {
            connection.release();
        }
    }

    // Obtener reportes de un usuario específico (reportado)
    async getReportsByUser(userId) {
        const connection = await db.getConnection();
        try {
            const [reportes] = await connection.query(
                `SELECT 
                    r.id_reporte,
                    r.razon,
                    r.descripcion,
                    r.estado,
                    r.fecha_reporte,
                    r.fecha_revision,
                    r.comentario_admin,
                    
                    ur.nombre as reporta_nombre,
                    ur.apellido as reporta_apellido,
                    
                    res.fecha as reserva_fecha,
                    a.nombre as area_nombre,
                    h.hora_inicio,
                    h.hora_fin
                    
                FROM Reportes r
                INNER JOIN usuarios ur ON r.id_usuario_reporta = ur.id_usuario
                INNER JOIN reservas res ON r.id_reserva = res.id_reserva
                INNER JOIN Areas a ON res.id_area = a.id_area
                INNER JOIN Horarios h ON res.id_horario = h.id_horario
                WHERE r.id_usuario_reportado = ?
                ORDER BY r.fecha_reporte DESC`,
                [userId]
            );

            return reportes;

        } finally {
            connection.release();
        }
    }

    // Sancionar usuario desde un reporte
    async sancionarDesdeReporte(reporteId, adminId, comentario) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Obtener datos del reporte
            const [reporte] = await connection.query(
                'SELECT id_usuario_reportado, id_reserva FROM Reportes WHERE id_reporte = ?',
                [reporteId]
            );

            if (!reporte || reporte.length === 0) {
                throw new Error('Reporte no encontrado');
            }

            const { id_usuario_reportado } = reporte[0];

            // Suspender al usuario (activo = 0)
            await connection.query(
                'UPDATE Usuarios SET activo = 0 WHERE id_usuario = ?',
                [id_usuario_reportado]
            );

            // Actualizar estado del reporte con el comentario del admin
            // El usuario podrá ver este comentario para saber por qué fue suspendido
            await connection.query(
                `UPDATE Reportes 
                SET estado = 'sancionado', 
                    fecha_revision = NOW(), 
                    id_admin_revisa = ?,
                    comentario_admin = ?
                WHERE id_reporte = ?`,
                [adminId, comentario, reporteId]
            );

            await connection.commit();

            return {
                success: true,
                message: 'Usuario suspendido exitosamente'
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Rechazar un reporte (sin sancionar)
    async rechazarReporte(reporteId, adminId, comentario) {
        const connection = await db.getConnection();
        try {
            await connection.query(
                `UPDATE Reportes 
                SET estado = 'rechazado', 
                    fecha_revision = NOW(), 
                    id_admin_revisa = ?,
                    comentario_admin = ?
                WHERE id_reporte = ?`,
                [adminId, comentario, reporteId]
            );

            return { message: 'Reporte rechazado' };

        } finally {
            connection.release();
        }
    }

    // Marcar como revisado sin acción
    async marcarRevisado(reporteId, adminId, comentario) {
        const connection = await db.getConnection();
        try {
            await connection.query(
                `UPDATE Reportes 
                SET estado = 'revisado', 
                    fecha_revision = NOW(), 
                    id_admin_revisa = ?,
                    comentario_admin = ?
                WHERE id_reporte = ?`,
                [adminId, comentario || 'Revisado', reporteId]
            );

            return { message: 'Reporte marcado como revisado' };

        } finally {
            connection.release();
        }
    }

    // Obtener sanciones de un usuario (para que vea por qué fue suspendido)
    async getSancionesUsuario(userId) {
        const connection = await db.getConnection();
        try {
            const [sanciones] = await connection.query(
                `SELECT 
                    r.id_reporte,
                    r.razon,
                    r.descripcion,
                    r.fecha_revision as fecha_sancion,
                    r.comentario_admin,
                    
                    -- Datos de la reserva sancionada
                    res.fecha as reserva_fecha,
                    a.nombre as area_nombre,
                    h.hora_inicio,
                    h.hora_fin,
                    
                    -- Admin que sancionó
                    ad.nombre as admin_nombre,
                    ad.apellido as admin_apellido
                    
                FROM Reportes r
                INNER JOIN reservas res ON r.id_reserva = res.id_reserva
                INNER JOIN Areas a ON res.id_area = a.id_area
                INNER JOIN Horarios h ON res.id_horario = h.id_horario
                LEFT JOIN Administradores ad ON r.id_admin_revisa = ad.id_admin
                WHERE r.id_usuario_reportado = ? 
                AND r.estado = 'sancionado'
                ORDER BY r.fecha_revision DESC`,
                [userId]
            );

            return sanciones;

        } finally {
            connection.release();
        }
    }
}

module.exports = new ReportService();

