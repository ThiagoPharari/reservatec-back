const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

// Obtener estadísticas del dashboard
router.get('/stats', dashboardController.getStats);

// Exportar estadísticas a Excel
router.get('/export/excel', dashboardController.exportToExcel);

// Exportar estadísticas a PDF
router.get('/export/pdf', dashboardController.exportToPDF);

module.exports = router;
