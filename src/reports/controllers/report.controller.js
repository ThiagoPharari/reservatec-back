const reportService = require('../services/report.service');

class ReportController {
    // Crear un nuevo reporte (usuario reporta una reserva)
    async createReport(req, res) {
        try {
            console.log('📝 Creando reporte - Body recibido:', req.body);
            const { id_reserva, razon, descripcion, id_usuario_reporta } = req.body;

            // Validaciones específicas
            if (!id_reserva) {
                console.log('❌ Falta id_reserva');
                return res.status(400).json({
                    success: false,
                    message: 'Falta el ID de la reserva'
                });
            }

            if (!id_usuario_reporta || id_usuario_reporta === 0) {
                console.log('❌ Falta id_usuario_reporta o es 0:', id_usuario_reporta);
                return res.status(400).json({
                    success: false,
                    message: 'No se pudo identificar al usuario que reporta'
                });
            }

            if (!razon) {
                console.log('❌ Falta razon/motivo');
                return res.status(400).json({
                    success: false,
                    message: 'Debe seleccionar un motivo para el reporte'
                });
            }

            console.log('✅ Datos válidos, creando reporte...');
            const result = await reportService.createReport({
                id_reserva,
                id_usuario_reporta,
                razon,
                descripcion
            });

            console.log('✅ Reporte creado exitosamente:', result);

            res.status(201).json({
                success: true,
                message: result.message,
                data: { id_reporte: result.id_reporte }
            });

        } catch (error) {
            console.error('❌ Error creando reporte:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al crear reporte'
            });
        }
    }

    // Obtener todos los reportes (para encargado)
    async getAllReports(req, res) {
        try {
            const { filtro } = req.query; // pendiente, revisado, sancionado, rechazado, todas
            console.log('📊 getAllReports - Filtro recibido:', filtro);

            const reportes = await reportService.getAllReports(filtro);
            console.log('📊 Reportes encontrados:', reportes.length);

            res.json({
                success: true,
                data: reportes
            });

        } catch (error) {
            console.error('❌ Error obteniendo reportes:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener reportes'
            });
        }
    }

    // Obtener reportes de un usuario específico
    async getReportsByUser(req, res) {
        try {
            const { userId } = req.params;

            const reportes = await reportService.getReportsByUser(userId);

            res.json({
                success: true,
                data: reportes
            });

        } catch (error) {
            console.error('Error obteniendo reportes del usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener reportes'
            });
        }
    }

    // Sancionar usuario desde un reporte
    async sancionarDesdeReporte(req, res) {
        try {
            const { reporteId } = req.params;
            const { comentario } = req.body;
            const adminId = 1; // En producción: req.user.id_admin

            const result = await reportService.sancionarDesdeReporte(
                reporteId,
                adminId,
                comentario
            );

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            console.error('Error sancionando desde reporte:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al sancionar usuario'
            });
        }
    }

    // Rechazar un reporte
    async rechazarReporte(req, res) {
        try {
            const { reporteId } = req.params;
            const { comentario } = req.body;
            const adminId = 1; // En producción: req.user.id_admin

            const result = await reportService.rechazarReporte(
                reporteId,
                adminId,
                comentario
            );

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            console.error('Error rechazando reporte:', error);
            res.status(500).json({
                success: false,
                message: 'Error al rechazar reporte'
            });
        }
    }

    // Marcar como revisado
    async marcarRevisado(req, res) {
        try {
            const { reporteId } = req.params;
            const { comentario } = req.body;
            const adminId = 1; // En producción: req.user.id_admin

            const result = await reportService.marcarRevisado(
                reporteId,
                adminId,
                comentario
            );

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            console.error('Error marcando como revisado:', error);
            res.status(500).json({
                success: false,
                message: 'Error al marcar como revisado'
            });
        }
    }

    // Obtener sanciones de un usuario (para que vea por qué fue suspendido)
    async getSancionesUsuario(req, res) {
        try {
            const { userId } = req.params;
            const sanciones = await reportService.getSancionesUsuario(userId);

            res.json({
                success: true,
                data: sanciones
            });

        } catch (error) {
            console.error('Error obteniendo sanciones:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener sanciones del usuario'
            });
        }
    }
}

module.exports = new ReportController();
