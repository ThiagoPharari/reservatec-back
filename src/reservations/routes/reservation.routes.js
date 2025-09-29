const express = require('express');
const ReservationController = require('../controllers/reservation.controller');

const router = express.Router();
const reservationController = new ReservationController();

// === RUTAS PARA ESTUDIANTES ===

// Crear nueva reserva
router.post('/', (req, res) => reservationController.createReservation(req, res));

// Obtener mis reservas
router.get('/my-reservations', (req, res) => reservationController.getMyReservations(req, res));

// Obtener áreas disponibles
router.get('/areas', (req, res) => reservationController.getAreas(req, res));

// Obtener horarios disponibles
router.get('/horarios', (req, res) => reservationController.getHorarios(req, res));

// Verificar disponibilidad de horario
router.get('/check-availability', (req, res) => reservationController.checkAvailability(req, res));

// Obtener horarios disponibles para una fecha y área específica
router.get('/available-slots', (req, res) => reservationController.getAvailableTimeSlots(req, res));

// Obtener detalle de reserva específica
router.get('/:id', (req, res) => reservationController.getReservationDetail(req, res));

// === RUTAS PARA ENCARGADOS ===

// Obtener reservas pendientes
router.get('/admin/pending', (req, res) => reservationController.getPendingReservations(req, res));

// Obtener reservas activas del día actual
router.get('/admin/active-today', (req, res) => reservationController.getActiveReservationsToday(req, res));

// Aprobar reserva
router.put('/:id/approve', (req, res) => reservationController.approveReservation(req, res));

// Rechazar reserva
router.put('/:id/reject', (req, res) => reservationController.rejectReservation(req, res));

// Cancelar reserva activa
router.put('/:id/cancel', (req, res) => reservationController.cancelReservation(req, res));

module.exports = router;