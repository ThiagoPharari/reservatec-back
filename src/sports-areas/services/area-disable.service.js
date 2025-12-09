const pool = require('../../database/connection');

class AreaDisableService {
    /**
     * Calcula la fecha de fin basada en la duración seleccionada
     * @param {string} duracion - Código de duración (1_dia, 2_dias, 3_dias, 1_semana, 2_semanas, 1_mes, indefinido)
     * @returns {Date|null} - Fecha de fin o null si es indefinido
     */
    calcularFechaFin(duracion) {
        const ahora = new Date();
        
        switch(duracion) {
            case '1_dia':
                ahora.setDate(ahora.getDate() + 1);
                return ahora;
            case '2_dias':
                ahora.setDate(ahora.getDate() + 2);
                return ahora;
            case '3_dias':
                ahora.setDate(ahora.getDate() + 3);
                return ahora;
            case '1_semana':
                ahora.setDate(ahora.getDate() + 7);
                return ahora;
            case '2_semanas':
                ahora.setDate(ahora.getDate() + 14);
                return ahora;
            case '1_mes':
                ahora.setMonth(ahora.getMonth() + 1);
                return ahora;
            case 'indefinido':
                return null;
            default:
                throw new Error('Duración no válida');
        }
    }

    /**
     * Convierte el código de duración a texto legible
     * @param {string} duracion - Código de duración
     * @returns {string} - Texto descriptivo de la duración
     */
    obtenerTextoDuracion(duracion) {
        const duraciones = {
            '1_dia': '1 día',
            '2_dias': '2 días',
            '3_dias': '3 días',
            '1_semana': '1 semana',
            '2_semanas': '2 semanas',
            '1_mes': '1 mes',
            'indefinido': 'Tiempo indefinido'
        };
        return duraciones[duracion] || 'Duración desconocida';
    }

    /**
     * Deshabilita un área deportiva por un tiempo determinado
     * @param {number} areaId - ID del área a deshabilitar
     * @param {string} motivo - Motivo de la deshabilitación
     * @param {string} duracion - Duración de la deshabilitación
     * @param {number} adminId - ID del encargado que deshabilita
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async deshabilitarArea(areaId, motivo, duracion, adminId) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Verificar que el área existe
            const [area] = await connection.query(
                'SELECT id_area, nombre, habilitada FROM areas WHERE id_area = ?',
                [areaId]
            );

            if (area.length === 0) {
                throw new Error('El área no existe');
            }

            if (!area[0].habilitada) {
                throw new Error('El área ya está deshabilitada');
            }

            const fechaDeshabilitacion = new Date();
            const fechaFin = this.calcularFechaFin(duracion);
            const textoDuracion = this.obtenerTextoDuracion(duracion);

            // Actualizar el área
            await connection.query(
                `UPDATE areas 
                SET habilitada = FALSE,
                    fecha_deshabilitacion = ?,
                    fecha_fin_deshabilitacion = ?,
                    motivo_deshabilitacion = ?,
                    deshabilitada_por = ?
                WHERE id_area = ?`,
                [fechaDeshabilitacion, fechaFin, motivo, adminId, areaId]
            );

            // Cancelar todas las reservas pendientes y futuras de esta área
            const [reservasCanceladas] = await connection.query(
                `UPDATE reservas 
                SET estado = 'rechazado',
                    comentario_encargado = 'Área deshabilitada. Motivo: ${motivo}'
                WHERE id_area = ? 
                AND estado = 'pendiente' 
                AND fecha >= CURDATE()`,
                [areaId]
            );

            await connection.commit();

            return {
                success: true,
                message: `Área deshabilitada por ${textoDuracion}`,
                areaNombre: area[0].nombre,
                fechaDeshabilitacion,
                fechaFin: fechaFin || 'Indefinido',
                motivoDeshabilitacion: motivo,
                reservasCanceladas: reservasCanceladas.affectedRows
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Habilita nuevamente un área deshabilitada
     * @param {number} areaId - ID del área a habilitar
     * @returns {Promise<Object>} - Resultado de la operación
     */
    async habilitarArea(areaId) {
        const connection = await pool.getConnection();
        
        try {
            // Verificar que el área existe y está deshabilitada
            const [area] = await connection.query(
                'SELECT id_area, nombre, habilitada FROM areas WHERE id_area = ?',
                [areaId]
            );

            if (area.length === 0) {
                throw new Error('El área no existe');
            }

            if (area[0].habilitada) {
                throw new Error('El área ya está habilitada');
            }

            // Habilitar el área y limpiar campos de deshabilitación
            await connection.query(
                `UPDATE areas 
                SET habilitada = TRUE,
                    fecha_deshabilitacion = NULL,
                    fecha_fin_deshabilitacion = NULL,
                    motivo_deshabilitacion = NULL,
                    deshabilitada_por = NULL
                WHERE id_area = ?`,
                [areaId]
            );

            return {
                success: true,
                message: 'Área habilitada nuevamente',
                areaNombre: area[0].nombre
            };

        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene la lista de áreas deshabilitadas
     * @returns {Promise<Array>} - Lista de áreas deshabilitadas con sus detalles
     */
    async obtenerAreasDeshabilitadas() {
        const connection = await pool.getConnection();
        
        try {
            const [areas] = await connection.query(
                `SELECT 
                    a.id_area,
                    a.nombre,
                    a.fecha_deshabilitacion,
                    a.fecha_fin_deshabilitacion,
                    a.motivo_deshabilitacion,
                    u.nombre as encargado_nombre,
                    u.apellido as encargado_apellido,
                    CASE 
                        WHEN a.fecha_fin_deshabilitacion IS NULL THEN 'Indefinido'
                        WHEN a.fecha_fin_deshabilitacion < NOW() THEN 'Expirado'
                        ELSE 'Activo'
                    END as estado_deshabilitacion
                FROM areas a
                LEFT JOIN usuarios u ON a.deshabilitada_por = u.id_usuario
                WHERE a.habilitada = FALSE
                ORDER BY a.fecha_deshabilitacion DESC`
            );

            return areas;

        } finally {
            connection.release();
        }
    }

    /**
     * Verifica y habilita automáticamente áreas cuyo período de deshabilitación ha expirado
     * Este método debe ejecutarse periódicamente (por ejemplo, mediante un cron job)
     * @returns {Promise<Object>} - Resultado con las áreas habilitadas
     */
    async verificarAreasExpiradas() {
        const connection = await pool.getConnection();
        
        try {
            // Habilitar áreas cuya fecha de fin ha pasado
            const [resultado] = await connection.query(
                `UPDATE areas 
                SET habilitada = TRUE,
                    fecha_deshabilitacion = NULL,
                    fecha_fin_deshabilitacion = NULL,
                    motivo_deshabilitacion = NULL,
                    deshabilitada_por = NULL
                WHERE habilitada = FALSE 
                AND fecha_fin_deshabilitacion IS NOT NULL 
                AND fecha_fin_deshabilitacion < NOW()`
            );

            return {
                success: true,
                areasHabilitadas: resultado.affectedRows,
                message: `${resultado.affectedRows} área(s) habilitada(s) automáticamente`
            };

        } finally {
            connection.release();
        }
    }
}

module.exports = new AreaDisableService();
