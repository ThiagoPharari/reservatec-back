const db = require('../../database/connection');

class AreaService {
    // Obtener todas las áreas con su configuración
    async getAreasConfig() {
        const connection = await db.getConnection();
        try {
            // Obtener áreas básicas
            const [areas] = await connection.query(`
                SELECT id_area, nombre, 
                       COALESCE(descripcion, '') as descripcion,
                       COALESCE(habilitada, 1) as habilitada, 
                       COALESCE(stock, 10) as stock
                FROM Areas
                ORDER BY id_area
            `);

            // Para cada área, obtener días y horarios deshabilitados
            const areasConConfig = await Promise.all(areas.map(async (area) => {
                // Obtener días deshabilitados
                let diasDeshabilitados = [];
                try {
                    const [dias] = await connection.query(`
                        SELECT dia_semana 
                        FROM Area_Dias_Deshabilitados 
                        WHERE id_area = ?
                    `, [area.id_area]);
                    diasDeshabilitados = dias.map(d => d.dia_semana);
                } catch (error) {
                    console.log('Tabla Area_Dias_Deshabilitados no existe aún:', error.message);
                }

                // Obtener horarios deshabilitados
                let horariosDeshabilitados = [];
                try {
                    const [horarios] = await connection.query(`
                        SELECT id_horario 
                        FROM Area_Horarios_Deshabilitados 
                        WHERE id_area = ?
                    `, [area.id_area]);
                    horariosDeshabilitados = horarios.map(h => h.id_horario);
                } catch (error) {
                    console.log('Tabla Area_Horarios_Deshabilitados no existe aún:', error.message);
                }

                return {
                    ...area,
                    habilitada: area.habilitada === 1,
                    diasDeshabilitados: diasDeshabilitados,
                    horariosDeshabilitados: horariosDeshabilitados
                };
            }));

            return areasConConfig;
        } finally {
            connection.release();
        }
    }

    // Actualizar configuración de un área
    async updateAreaConfig(areaId, config) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Actualizar campos básicos del área
            if (config.hasOwnProperty('habilitada')) {
                await connection.query(`
                    UPDATE Areas 
                    SET habilitada = ? 
                    WHERE id_area = ?
                `, [config.habilitada ? 1 : 0, areaId]);
            }

            if (config.hasOwnProperty('stock')) {
                await connection.query(`
                    UPDATE Areas 
                    SET stock = ? 
                    WHERE id_area = ?
                `, [config.stock, areaId]);
            }

            // Actualizar días deshabilitados
            if (config.hasOwnProperty('diasDeshabilitados')) {
                // Eliminar todos los días anteriores
                await connection.query(`
                    DELETE FROM Area_Dias_Deshabilitados 
                    WHERE id_area = ?
                `, [areaId]);

                // Insertar nuevos días deshabilitados
                if (config.diasDeshabilitados.length > 0) {
                    const values = config.diasDeshabilitados.map(dia => [areaId, dia]);
                    await connection.query(`
                        INSERT INTO Area_Dias_Deshabilitados (id_area, dia_semana) 
                        VALUES ?
                    `, [values]);
                }
            }

            // Actualizar horarios deshabilitados
            if (config.hasOwnProperty('horariosDeshabilitados')) {
                // Eliminar todos los horarios anteriores
                await connection.query(`
                    DELETE FROM Area_Horarios_Deshabilitados 
                    WHERE id_area = ?
                `, [areaId]);

                // Insertar nuevos horarios deshabilitados
                if (config.horariosDeshabilitados.length > 0) {
                    const values = config.horariosDeshabilitados.map(horario => [areaId, horario]);
                    await connection.query(`
                        INSERT INTO Area_Horarios_Deshabilitados (id_area, id_horario) 
                        VALUES ?
                    `, [values]);
                }
            }

            await connection.commit();
            return { success: true };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Verificar si un área está disponible para una fecha y horario específicos
    async checkAreaAvailability(areaId, fecha, horarioId) {
        const connection = await db.getConnection();
        try {
            // Verificar si el área está habilitada
            const [area] = await connection.query(`
                SELECT habilitada FROM Areas WHERE id_area = ?
            `, [areaId]);

            if (area.length === 0 || !area[0].habilitada) {
                return false;
            }

            // Obtener el día de la semana de la fecha
            const date = new Date(fecha);
            const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const diaSemana = diasSemana[date.getDay()];

            // Verificar si el día está deshabilitado
            const [diaDeshabilitado] = await connection.query(`
                SELECT COUNT(*) as count 
                FROM Area_Dias_Deshabilitados 
                WHERE id_area = ? AND dia_semana = ?
            `, [areaId, diaSemana]);

            if (diaDeshabilitado[0].count > 0) {
                return false;
            }

            // Verificar si el horario está deshabilitado
            const [horarioDeshabilitado] = await connection.query(`
                SELECT COUNT(*) as count 
                FROM Area_Horarios_Deshabilitados 
                WHERE id_area = ? AND id_horario = ?
            `, [areaId, horarioId]);

            if (horarioDeshabilitado[0].count > 0) {
                return false;
            }

            return true;
        } finally {
            connection.release();
        }
    }
}

module.exports = new AreaService();
