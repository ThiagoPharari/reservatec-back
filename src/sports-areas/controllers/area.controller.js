const areaService = require('../services/area.service');
const areaDisableService = require('../services/area-disable.service');

class AreaController {
    // Obtener todas las áreas con configuración
    async getAreasConfig(req, res) {
        try {
            const areas = await areaService.getAreasConfig();
            res.json({
                success: true,
                data: areas
            });
        } catch (error) {
            console.error('Error obteniendo configuración de áreas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener configuración de áreas'
            });
        }
    }

    // Actualizar configuración de un área
    async updateAreaConfig(req, res) {
        try {
            const { id } = req.params;
            const config = req.body;

            await areaService.updateAreaConfig(parseInt(id), config);

            res.json({
                success: true,
                message: 'Configuración actualizada exitosamente'
            });
        } catch (error) {
            console.error('Error actualizando configuración de área:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar configuración de área'
            });
        }
    }

    // Verificar disponibilidad de un área
    async checkAvailability(req, res) {
        try {
            const { areaId, fecha, horarioId } = req.query;

            if (!areaId || !fecha || !horarioId) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan parámetros requeridos'
                });
            }

            const available = await areaService.checkAreaAvailability(
                parseInt(areaId),
                fecha,
                parseInt(horarioId)
            );

            res.json({
                success: true,
                available
            });
        } catch (error) {
            console.error('Error verificando disponibilidad:', error);
            res.status(500).json({
                success: false,
                message: 'Error al verificar disponibilidad'
            });
        }
    }

    // Deshabilitar un área con duración específica
    async deshabilitarArea(req, res) {
        try {
            const { id } = req.params;
            const { motivo, duracion } = req.body;
            const adminId = req.user.id_usuario;

            // Validar que se proporcionó motivo y duración
            if (!motivo || !duracion) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere motivo y duración para deshabilitar el área'
                });
            }

            // Validar que la duración es válida
            const duracionesValidas = ['1_dia', '2_dias', '3_dias', '1_semana', '2_semanas', '1_mes', 'indefinido'];
            if (!duracionesValidas.includes(duracion)) {
                return res.status(400).json({
                    success: false,
                    message: 'Duración no válida. Opciones: 1_dia, 2_dias, 3_dias, 1_semana, 2_semanas, 1_mes, indefinido'
                });
            }

            const resultado = await areaDisableService.deshabilitarArea(
                parseInt(id),
                motivo,
                duracion,
                adminId
            );

            res.json({
                success: true,
                message: resultado.message,
                data: resultado
            });

        } catch (error) {
            console.error('Error deshabilitando área:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al deshabilitar área'
            });
        }
    }

    // Habilitar nuevamente un área
    async habilitarArea(req, res) {
        try {
            const { id } = req.params;

            const resultado = await areaDisableService.habilitarArea(parseInt(id));

            res.json({
                success: true,
                message: resultado.message,
                data: resultado
            });

        } catch (error) {
            console.error('Error habilitando área:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al habilitar área'
            });
        }
    }

    // Obtener áreas deshabilitadas
    async getAreasDeshabilitadas(req, res) {
        try {
            const areas = await areaDisableService.obtenerAreasDeshabilitadas();

            res.json({
                success: true,
                data: areas
            });

        } catch (error) {
            console.error('Error obteniendo áreas deshabilitadas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener áreas deshabilitadas'
            });
        }
    }
}

module.exports = new AreaController();
