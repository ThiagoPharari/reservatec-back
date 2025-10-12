const ReservationService = require('../services/reservation.service');
const ReservaDTO = require('../dtos/reserva.dto');

class ReservationController {
    constructor() {
        this.reservationService = new ReservationService();
    }

    // Obtener todas las áreas deportivas
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

    // Obtener todos los horarios
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

    // Obtener horarios disponibles para una fecha y área específica
    async getHorariosDisponibles(req, res) {
        try {
            const { area_id, fecha } = req.query;
            
            if (!area_id || !fecha) {
                return res.status(400).json({
                    success: false,
                    message: 'area_id y fecha son requeridos'
                });
            }

            const horariosDisponibles = await this.reservationService.getHorariosDisponibles(
                parseInt(area_id), 
                fecha
            );
            
            res.json({
                success: true,
                data: horariosDisponibles
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Crear una nueva reserva
    async crearReserva(req, res) {
        try {
            const userEmail = req.user.email;
            
            // Validar datos usando DTO
            const reservaDTO = new ReservaDTO(req.body);
            reservaDTO.validate();
            
            const reservaData = { ...reservaDTO.getData(), user_email: userEmail };
            const reservaId = await this.reservationService.crearReserva(reservaData);
            
            res.status(201).json({
                success: true,
                message: 'Reserva creada exitosamente',
                data: { id_reserva: reservaId }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener reservas pendientes (para encargados)
    async getReservasPendientes(req, res) {
        try {
            const reservas = await this.reservationService.getReservasByEstado('pendiente');
            
            // Log de depuración para verificar los datos
            console.log('=== RESERVAS PENDIENTES DEBUG ===');
            if (reservas.length > 0) {
                console.log('Primera reserva:', JSON.stringify(reservas[0], null, 2));
                console.log('Área nombre:', reservas[0].area_nombre);
                console.log('ID área:', reservas[0].id_area);
            }
            console.log('Total reservas:', reservas.length);
            console.log('================================');
            
            res.json({
                success: true,
                data: reservas
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener reservas activas/aceptadas
    async getReservasActivas(req, res) {
        try {
            const reservas = await this.reservationService.getReservasByEstado('aceptado');
            res.json({
                success: true,
                data: reservas
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Aceptar una reserva
    async aceptarReserva(req, res) {
        try {
            const { id } = req.params;
            const comentario = req.body?.comentario || null;
            
            await this.reservationService.cambiarEstadoReserva(
                parseInt(id), 
                'aceptado', 
                comentario
            );
            
            res.json({
                success: true,
                message: 'Reserva aceptada exitosamente'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Rechazar una reserva
    async rechazarReserva(req, res) {
        try {
            const { id } = req.params;
            const { comentario } = req.body;
            
            if (!comentario) {
                return res.status(400).json({
                    success: false,
                    message: 'El comentario es requerido para rechazar una reserva'
                });
            }

            await this.reservationService.cambiarEstadoReserva(
                parseInt(id), 
                'rechazado', 
                comentario
            );
            
            res.json({
                success: true,
                message: 'Reserva rechazada exitosamente'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener las reservas del usuario autenticado
    async getMisReservas(req, res) {
        try {
            const userEmail = req.user.email;
            const reservas = await this.reservationService.getReservasByUsuario(userEmail);
            
            res.json({
                success: true,
                data: reservas
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Cancelar una reserva propia
    async cancelarReserva(req, res) {
        try {
            const { id } = req.params;
            const userEmail = req.user.email;
            
            await this.reservationService.cancelarReservaUsuario(
                parseInt(id), 
                userEmail
            );
            
            res.json({
                success: true,
                message: 'Reserva cancelada exitosamente'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = ReservationController;