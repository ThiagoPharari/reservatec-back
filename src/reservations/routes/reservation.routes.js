const express = require('express');
const ReservationController = require('../controllers/reservation.controller');
const { validateToken } = require('../../shared/middlewares/auth.middleware');

const router = express.Router();
const reservationController = new ReservationController();

// Rutas públicas (para obtener información básica)
router.get('/areas', reservationController.getAreas.bind(reservationController));
router.get('/horarios', reservationController.getHorarios.bind(reservationController));
router.get('/horarios-disponibles', reservationController.getHorariosDisponibles.bind(reservationController));

// Rutas para encargados (temporalmente sin autenticación para pruebas)
router.get('/pendientes', reservationController.getReservasPendientes.bind(reservationController));
router.get('/activas', reservationController.getReservasActivas.bind(reservationController));
router.put('/:id/aceptar', reservationController.aceptarReserva.bind(reservationController));
router.put('/:id/rechazar', reservationController.rechazarReserva.bind(reservationController));

// Rutas protegidas (requieren autenticación)
router.use(validateToken); // Aplicar middleware de autenticación a todas las rutas siguientes

// Rutas para estudiantes
router.post('/crear', reservationController.crearReserva.bind(reservationController));
router.get('/mis-reservas', reservationController.getMisReservas.bind(reservationController));
router.put('/:id/cancelar', reservationController.cancelarReserva.bind(reservationController));

module.exports = router;