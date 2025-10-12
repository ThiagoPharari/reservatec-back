const express = require('express');
const router = express.Router();
const areaController = require('../controllers/area.controller');

// Obtener todas las áreas con configuración
router.get('/config', areaController.getAreasConfig);

// Actualizar configuración de un área
router.put('/config/:id', areaController.updateAreaConfig);

// Verificar disponibilidad de un área
router.get('/check-availability', areaController.checkAvailability);

module.exports = router;
