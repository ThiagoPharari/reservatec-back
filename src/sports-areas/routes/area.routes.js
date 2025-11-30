const express = require('express');
const router = express.Router();
const areaController = require('../controllers/area.controller');

// Obtener todas las áreas con configuración
router.get('/config', areaController.getAreasConfig);

// Actualizar configuración de un área
router.put('/config/:id', areaController.updateAreaConfig);

// Verificar disponibilidad de un área
router.get('/check-availability', areaController.checkAvailability);

// ===== Rutas de deshabilitación de áreas (requieren autenticación de encargado) =====
// Deshabilitar un área con duración
router.post('/:id/deshabilitar', areaController.deshabilitarArea);

// Habilitar un área deshabilitada
router.post('/:id/habilitar', areaController.habilitarArea);

// Obtener lista de áreas deshabilitadas
router.get('/deshabilitadas/lista', areaController.getAreasDeshabilitadas);

module.exports = router;
