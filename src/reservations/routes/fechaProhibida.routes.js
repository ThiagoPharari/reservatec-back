const express = require('express');
const multer = require('multer');
const fechaProhibidaController = require('../controllers/fechaProhibida.controller');
const { validateToken } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

// Configurar multer para manejar uploads de archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Límite de 5MB
    },
    fileFilter: (req, file, cb) => {
        // Aceptar solo archivos Excel
        const validMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel' // .xls
        ];
        
        if (validMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos Excel (.xlsx o .xls)'));
        }
    }
});

// Rutas para encargados (temporalmente sin autenticación, igual que otras rutas del encargado)
/**
 * @route POST /api/reservations/fechas-prohibidas/upload
 * @desc Subir archivo Excel con fechas prohibidas
 * @access Public (para encargados)
 */
router.post('/upload', upload.single('archivo'), fechaProhibidaController.subirExcel);

/**
 * @route GET /api/reservations/fechas-prohibidas
 * @desc Obtener todas las fechas prohibidas activas
 * @access Public (para encargados)
 */
router.get('/', fechaProhibidaController.obtenerFechasProhibidas);

/**
 * @route POST /api/reservations/fechas-prohibidas/batch
 * @desc Guardar múltiples fechas prohibidas
 * @access Public (para encargados)
 */
router.post('/batch', fechaProhibidaController.guardarFechasProhibidas);

/**
 * @route DELETE /api/reservations/fechas-prohibidas/:id
 * @desc Eliminar una fecha prohibida
 * @access Public (para encargados)
 */
router.delete('/:id', fechaProhibidaController.eliminarFechaProhibida);

/**
 * @route GET /api/reservations/fechas-prohibidas/validar
 * @desc Validar si una fecha específica está prohibida
 * @query fecha (YYYY-MM-DD)
 * @access Public (para encargados)
 */
router.get('/validar', fechaProhibidaController.validarFecha);

/**
 * @route GET /api/reservations/fechas-prohibidas/rango
 * @desc Obtener fechas prohibidas en un rango
 * @query fechaInicio (YYYY-MM-DD), fechaFin (YYYY-MM-DD)
 * @access Public (para encargados)
 */
router.get('/rango', fechaProhibidaController.obtenerFechasEnRango);

/**
 * @route GET /api/reservations/fechas-prohibidas/todas
 * @desc Obtener todas las fechas individuales prohibidas (expandidas desde rangos)
 * @access Public (para encargados)
 */
router.get('/todas', fechaProhibidaController.obtenerTodasLasFechas);

// Si en el futuro necesitas rutas protegidas con autenticación, agrégalas después de esta línea:
// router.use(validateToken);
// router.post('/ruta-protegida', ...);

module.exports = router;
