const areaService = require('../services/area.service');

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
}

module.exports = new AreaController();
