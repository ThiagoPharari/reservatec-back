const db = require('../../database/connection');

class ReportService {
    // Crear un nuevo reporte (denuncia de usuario)
    async createReport(reportData) {
        const { id_reserva, id_usuario_reporta, razon, descripcion } = reportData;
        
        console.log('🔍 createReport - Datos recibidos:', reportData);
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Obtener datos completos de la reserva reportada
            console.log('🔍 Buscando reserva con id:', id_reserva);
            const [reserva] = await connection.query(
                `SELECT 
                    r.id_usuario,
                    r.fecha,
                    CONCAT(h.hora_inicio, '-', h.hora_fin) as horario,
                    a.nombre as area,
                    CONCAT(u.nombre, ' ', u.apellido) as nombre_reportado
                FROM reservas r
                INNER JOIN horarios h ON r.id_horario = h.id_horario
                INNER JOIN areas a ON r.id_area = a.id_area
                INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
                WHERE r.id_reserva = ?`,
                [id_reserva]
            );

            console.log('🔍 Reserva encontrada:', reserva);

            if (!reserva || reserva.length === 0) {
                throw new Error('Reserva no encontrada');
            }

            const id_usuario_reportado = reserva[0].id_usuario;

            console.log('🔍 Usuario reportado:', id_usuario_reportado);

            // No permitir que un usuario se reporte a sí mismo
            if (id_usuario_reporta === id_usuario_reportado) {
                throw new Error('No puedes reportar tu propia reserva');
            }

            // Obtener nombre del usuario que reporta
            const [usuarioReporta] = await connection.query(
                'SELECT CONCAT(nombre, " ", apellido) as nombre_completo FROM usuarios WHERE id_usuario = ?',
                [id_usuario_reporta]
            );

            // Insertar el reporte en la tabla simplificada
            console.log('🔍 Insertando reporte en DB...');
            const [result] = await connection.query(
                `INSERT INTO reportes_usuarios 
                (id_reserva, id_usuario_reporta, nombre_reportante, nombre_reportado, motivo, descripcion, fecha_reserva, horario, area, estado, fecha_reporte)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', NOW())`,
                [
                    id_reserva, 
                    id_usuario_reporta, 
                    usuarioReporta[0]?.nombre_completo || 'Usuario',
                    reserva[0].nombre_reportado,
                    razon, 
                    descripcion || '',
                    reserva[0].fecha,
                    reserva[0].horario,
                    reserva[0].area
                ]
            );

            console.log('✅ Reporte insertado con ID:', result.insertId);

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
                    ru.id_reporte,
                    ru.id_reserva,
                    ru.motivo as razon,
                    ru.descripcion,
                    ru.fecha_reserva,
                    ru.horario,
                    ru.area as area_nombre,
                    ru.estado,
                    ru.fecha_reporte,
                    ru.fecha_revision,
                    ru.comentario_admin,
                    
                    -- Usuario que reporta
                    ur.nombre as reporta_nombre,
                    ur.apellido as reporta_apellido,
                    ur.foto as reporta_foto,
                    
                    -- Usuario reportado (de la reserva)
                    res.id_usuario as id_usuario_reportado,
                    u.nombre as reportado_nombre,
                    u.apellido as reportado_apellido,
                    u.dni as reportado_dni,
                    u.activo as reportado_activo,
                    
                    -- Información de la reserva
                    res.participantes,
                    res.estado as reserva_estado,
                    
                    -- Horario separado
                    h.hora_inicio,
                    h.hora_fin,
                    
                    -- Admin que revisó
                    ua.nombre as admin_nombre,
                    ua.apellido as admin_apellido
                    
                FROM reportes_usuarios ru
                INNER JOIN reservas res ON ru.id_reserva = res.id_reserva
                INNER JOIN usuarios u ON res.id_usuario = u.id_usuario
                LEFT JOIN usuarios ur ON ru.id_usuario_reporta = ur.id_usuario
                LEFT JOIN horarios h ON res.id_horario = h.id_horario
                LEFT JOIN usuarios ua ON ru.id_admin = ua.id_usuario
            `;

            const params = [];

            if (filtro && filtro !== 'todas') {
                query += ' WHERE ru.estado = ?';
                params.push(filtro);
            }

            query += ' ORDER BY ru.fecha_reporte DESC';

            console.log('🔍 Query SQL:', query);
            console.log('🔍 Params:', params);

            const [reportes] = await connection.query(query, params);

            console.log('🔍 Reportes encontrados en DB:', reportes.length);
            if (reportes.length > 0) {
                console.log('🔍 Primer reporte:', reportes[0]);
            }

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
                    
                FROM reportes r
                INNER JOIN usuarios ur ON r.id_usuario_reporta = ur.id_usuario
                INNER JOIN reservas res ON r.id_reserva = res.id_reserva
                INNER JOIN areas a ON res.id_area = a.id_area
                INNER JOIN horarios h ON res.id_horario = h.id_horario
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
                'SELECT id_usuario_reportado, id_reserva FROM reportes WHERE id_reporte = ?',
                [reporteId]
            );

            if (!reporte || reporte.length === 0) {
                throw new Error('Reporte no encontrado');
            }

            const { id_usuario_reportado } = reporte[0];

            // Suspender al usuario (activo = 0)
            await connection.query(
                'UPDATE usuarios SET activo = 0 WHERE id_usuario = ?',
                [id_usuario_reportado]
            );

            // Actualizar estado del reporte con el comentario del admin
            // El usuario podrá ver este comentario para saber por qué fue suspendido
            await connection.query(
                `UPDATE reportes 
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
                `UPDATE reportes 
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
                `UPDATE reportes 
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
                    
                FROM reportes r
                INNER JOIN reservas res ON r.id_reserva = res.id_reserva
                INNER JOIN areas a ON res.id_area = a.id_area
                INNER JOIN horarios h ON res.id_horario = h.id_horario
                LEFT JOIN administradores ad ON r.id_admin_revisa = ad.id_admin
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

