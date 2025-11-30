/**
 * @file Servicio de Suspensión de Usuarios
 * @description Gestiona las suspensiones de usuarios con duración personalizada
 */

const db = require('../../database/connection');
const emailService = require('../../shared/services/email.service');

class SuspensionService {
    /**
     * Calcula la fecha de fin de suspensión según la duración
     * @param {string} duracion - Duración de la suspensión
     * @returns {Date|null} Fecha de fin o null si es indefinida
     */
    calcularFechaFin(duracion) {
        const ahora = new Date();
        
        switch (duracion) {
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
                return null; // NULL en la base de datos indica suspensión indefinida
            default:
                throw new Error('Duración de suspensión no válida');
        }
    }

    /**
     * Obtiene el texto legible de la duración
     * @param {string} duracion - Duración codificada
     * @returns {string} Texto legible
     */
    obtenerTextoDuracion(duracion) {
        const duraciones = {
            '1_dia': '1 día',
            '2_dias': '2 días',
            '3_dias': '3 días',
            '1_semana': '1 semana',
            '2_semanas': '2 semanas',
            '1_mes': '1 mes',
            'indefinido': 'Indefinida'
        };
        
        return duraciones[duracion] || 'No especificada';
    }

    /**
     * Suspende un usuario con duración personalizada
     * @param {number} userId - ID del usuario a suspender
     * @param {string} motivo - Motivo de la suspensión
     * @param {string} duracion - Duración: 1_dia, 2_dias, 3_dias, 1_semana, 2_semanas, 1_mes, indefinido
     * @param {number} adminId - ID del administrador que suspende
     * @returns {Promise<object>} Resultado de la operación
     */
    async suspenderUsuario(userId, motivo, duracion, adminId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Verificar que el usuario existe y no está ya suspendido
            const [usuario] = await connection.query(
                'SELECT * FROM usuarios WHERE id_usuario = ?',
                [userId]
            );

            if (usuario.length === 0) {
                throw new Error('Usuario no encontrado');
            }

            if (!usuario[0].activo) {
                throw new Error('El usuario ya está suspendido');
            }

            // 2. Calcular fecha de fin de suspensión
            const fechaFin = this.calcularFechaFin(duracion);
            const fechaSuspension = new Date();

            // 3. Actualizar el usuario
            await connection.query(`
                UPDATE usuarios 
                SET activo = 0,
                    fecha_suspension = ?,
                    fecha_fin_suspension = ?,
                    motivo_suspension = ?,
                    suspendido_por = ?
                WHERE id_usuario = ?
            `, [fechaSuspension, fechaFin, motivo, adminId, userId]);

            await connection.commit();

            // 4. Preparar datos para el correo
            const userData = {
                id_usuario: userId,
                nombre: usuario[0].nombre,
                apellido: usuario[0].apellido,
                correo: usuario[0].correo,
                motivo_suspension: motivo,
                duracion_texto: this.obtenerTextoDuracion(duracion),
                fecha_fin_suspension: fechaFin
            };

            // 5. Enviar correo de notificación (asíncrono, no bloquea)
            emailService.enviarCorreoSuspension(userData)
                .catch(err => console.error('Error al enviar correo de suspensión:', err));

            return {
                success: true,
                message: `Usuario ${usuario[0].nombre} ${usuario[0].apellido} suspendido exitosamente`,
                data: {
                    id_usuario: userId,
                    nombre_completo: `${usuario[0].nombre} ${usuario[0].apellido}`,
                    fecha_suspension: fechaSuspension,
                    fecha_fin_suspension: fechaFin,
                    duracion: this.obtenerTextoDuracion(duracion),
                    motivo: motivo
                }
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Levanta la suspensión de un usuario
     * @param {number} userId - ID del usuario
     * @returns {Promise<object>} Resultado de la operación
     */
    async levantarSuspension(userId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Verificar que el usuario existe
            const [usuario] = await connection.query(
                'SELECT * FROM usuarios WHERE id_usuario = ?',
                [userId]
            );

            if (usuario.length === 0) {
                throw new Error('Usuario no encontrado');
            }

            if (usuario[0].activo) {
                throw new Error('El usuario no está suspendido');
            }

            // Reactivar usuario y limpiar datos de suspensión
            await connection.query(`
                UPDATE usuarios 
                SET activo = 1,
                    fecha_suspension = NULL,
                    fecha_fin_suspension = NULL,
                    motivo_suspension = NULL,
                    suspendido_por = NULL
                WHERE id_usuario = ?
            `, [userId]);

            await connection.commit();

            return {
                success: true,
                message: `Suspensión levantada para ${usuario[0].nombre} ${usuario[0].apellido}`,
                data: {
                    id_usuario: userId,
                    nombre_completo: `${usuario[0].nombre} ${usuario[0].apellido}`
                }
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene todos los usuarios suspendidos
     * @returns {Promise<Array>} Lista de usuarios suspendidos
     */
    async obtenerUsuariosSuspendidos() {
        const [usuarios] = await db.query(`
            SELECT 
                u.id_usuario,
                u.nombre,
                u.apellido,
                u.dni,
                u.correo,
                u.fecha_suspension,
                u.fecha_fin_suspension,
                u.motivo_suspension,
                a.nombre as suspendido_por_nombre,
                a.apellido as suspendido_por_apellido,
                CASE 
                    WHEN u.fecha_fin_suspension IS NULL THEN 'Indefinida'
                    WHEN u.fecha_fin_suspension > NOW() THEN CONCAT('Hasta ', DATE_FORMAT(u.fecha_fin_suspension, '%d/%m/%Y'))
                    ELSE 'Expirada'
                END as estado_suspension
            FROM usuarios u
            LEFT JOIN administradores a ON u.suspendido_por = a.id_admin
            WHERE u.activo = 0
            ORDER BY u.fecha_suspension DESC
        `);

        return usuarios;
    }

    /**
     * Verifica y levanta automáticamente suspensiones que han expirado
     * Este método debería ejecutarse periódicamente (cron job)
     */
    async verificarSuspensionesExpiradas() {
        try {
            const [usuariosExpirados] = await db.query(`
                SELECT id_usuario, nombre, apellido 
                FROM usuarios 
                WHERE activo = 0 
                AND fecha_fin_suspension IS NOT NULL 
                AND fecha_fin_suspension <= NOW()
            `);

            let levantadas = 0;

            for (const usuario of usuariosExpirados) {
                try {
                    await this.levantarSuspension(usuario.id_usuario);
                    levantadas++;
                    console.log(`✅ Suspensión levantada automáticamente para: ${usuario.nombre} ${usuario.apellido}`);
                } catch (error) {
                    console.error(`❌ Error al levantar suspensión de ${usuario.nombre}:`, error.message);
                }
            }

            return {
                success: true,
                message: `${levantadas} suspensiones levantadas automáticamente`,
                levantadas
            };

        } catch (error) {
            console.error('Error al verificar suspensiones expiradas:', error);
            throw error;
        }
    }
}

module.exports = new SuspensionService();
