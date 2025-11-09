const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');

// Crear un nuevo reporte (usuario reporta una reserva)
router.post('/', reportController.createReport);

// Obtener todos los reportes (para encargado) con filtro opcional
// Query params: ?filtro=pendiente|revisado|sancionado|rechazado|todas
router.get('/', reportController.getAllReports);

// Obtener reportes de un usuario específico
router.get('/usuario/:userId', reportController.getReportsByUser);

// Obtener sanciones de un usuario (para mostrarle por qué fue suspendido)
router.get('/sanciones/:userId', reportController.getSancionesUsuario);

// Sancionar usuario desde un reporte
router.put('/:reporteId/sancionar', reportController.sancionarDesdeReporte);

// Rechazar un reporte (sin sancionar)
router.put('/:reporteId/rechazar', reportController.rechazarReporte);

// Marcar como revisado
router.put('/:reporteId/marcar-revisado', reportController.marcarRevisado);

module.exports = router;
