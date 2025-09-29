const ReservationService = require('../services/reservation.service');
const ReservationDTO = require('../dtos/reservation.dto');

class ReservationController {
    constructor() {
        this.reservationService = new ReservationService();
    }

    // Crear nueva reserva
    async createReservation(req, res) {
        try {
            const reservationDTO = new ReservationDTO(req.body);
            reservationDTO.validate();

            const reservationId = await this.reservationService.createReservation(reservationDTO);
            
            res.status(201).json({
                success: true,
                message: 'Reserva creada exitosamente',
                reservationId,
                data: {
                    id_reserva: reservationId,
                    estado: 'pendiente'
                }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener reservas del usuario autenticado (desde JWT)
    async getMyReservations(req, res) {
        try {
            // Aquí obtendrías el userId del JWT token
            // Por ahora, lo obtenemos del query parameter
            const { userId } = req.query;
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de usuario requerido'
                });
            }

            const reservations = await this.reservationService.getReservationsByUser(userId);
            
            res.json({
                success: true,
                data: reservations
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener reservas pendientes (para encargados)
    async getPendingReservations(req, res) {
        try {
            const reservations = await this.reservationService.getReservationsByStatus('pendiente');
            
            res.json({
                success: true,
                data: reservations
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener reservas activas del día actual (para encargados)
    async getActiveReservationsToday(req, res) {
        try {
            const reservations = await this.reservationService.getActiveReservationsToday();
            
            res.json({
                success: true,
                data: reservations
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Aprobar reserva
    async approveReservation(req, res) {
        try {
            const { id } = req.params;
            const { comentario } = req.body;

            let comentarioId = null;
            
            // Si hay comentario, crear registro en comentarios
            if (comentario) {
                // Aquí necesitarías el ID del administrador
                // Por ahora usamos un valor fijo, pero debería venir del JWT
                comentarioId = await this.createComment(1, comentario);
            }

            const updated = await this.reservationService.updateReservationStatus(id, 'aceptado', comentarioId);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Reserva aprobada exitosamente'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Reserva no encontrada'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Rechazar reserva
    async rejectReservation(req, res) {
        try {
            const { id } = req.params;
            const { comentario } = req.body;

            let comentarioId = null;
            
            // Si hay comentario, crear registro en comentarios
            if (comentario) {
                comentarioId = await this.createComment(1, comentario);
            }

            const updated = await this.reservationService.updateReservationStatus(id, 'cancelado', comentarioId);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Reserva rechazada exitosamente'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Reserva no encontrada'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Cancelar reserva activa
    async cancelReservation(req, res) {
        try {
            const { id } = req.params;
            const { comentario } = req.body;

            let comentarioId = null;
            
            if (comentario) {
                comentarioId = await this.createComment(1, comentario);
            }

            const updated = await this.reservationService.updateReservationStatus(id, 'cancelado', comentarioId);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Reserva cancelada exitosamente'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Reserva no encontrada'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener áreas disponibles
    async getAreas(req, res) {
        try {
            const areas = await this.reservationService.getAreas();
            
            res.json({
                success: true,
                data: areas
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener horarios disponibles
    async getHorarios(req, res) {
        try {
            const horarios = await this.reservationService.getHorarios();
            
            res.json({
                success: true,
                data: horarios
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Verificar disponibilidad
    async checkAvailability(req, res) {
        try {
            const { areaId, horarioId, fecha } = req.query;
            
            if (!areaId || !horarioId || !fecha) {
                return res.status(400).json({
                    success: false,
                    message: 'Área, horario y fecha son requeridos'
                });
            }

            const isAvailable = await this.reservationService.checkAvailability(areaId, horarioId, fecha);
            
            res.json({
                success: true,
                available: isAvailable
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener horarios disponibles para una fecha y área
    async getAvailableTimeSlots(req, res) {
        try {
            const { areaId, fecha } = req.query;
            
            if (!areaId || !fecha) {
                return res.status(400).json({
                    success: false,
                    message: 'Área y fecha son requeridos'
                });
            }

            const availableSlots = await this.reservationService.getAvailableTimeSlots(areaId, fecha);
            
            res.json({
                success: true,
                data: availableSlots
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener detalle de reserva
    async getReservationDetail(req, res) {
        try {
            const { id } = req.params;
            
            const reservation = await this.reservationService.getReservationById(id);
            
            if (reservation) {
                res.json({
                    success: true,
                    data: reservation
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Reserva no encontrada'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Método auxiliar para crear comentarios
    async createComment(adminId, comentario) {
        const db = require('../../database/connection');
        const [result] = await db.query(
            'INSERT INTO Comentarios (id_admin, comentario) VALUES (?, ?)',
            [adminId, comentario]
        );
        return result.insertId;
    }
}

module.exports = ReservationController;