class ReservationDTO {
    constructor(data) {
        this.id_usuario = data.id_usuario;
        this.id_area = data.id_area;
        this.id_horario = data.id_horario;
        this.fecha = data.fecha;
        this.participantes = data.participantes;
        this.material = data.material || false;
        this.estado = data.estado || 'pendiente';
        this.id_comentario = data.id_comentario || null;
    }

    validate() {
        // Validar campos requeridos
        if (!this.id_usuario) throw new Error('El ID del usuario es requerido');
        if (!this.id_area) throw new Error('El ID del área es requerido');
        if (!this.id_horario) throw new Error('El ID del horario es requerido');
        if (!this.fecha) throw new Error('La fecha es requerida');
        if (!this.participantes || this.participantes < 1) throw new Error('El número de participantes debe ser mayor a 0');

        // Validar formato de fecha
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(this.fecha)) {
            throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
        }

        // Validar que la fecha no sea en el pasado
        const today = new Date();
        const reservationDate = new Date(this.fecha);
        today.setHours(0, 0, 0, 0);
        reservationDate.setHours(0, 0, 0, 0);
        
        if (reservationDate < today) {
            throw new Error('No se pueden hacer reservas para fechas pasadas');
        }

        // Validar estado
        const validStates = ['pendiente', 'aceptado', 'cancelado', 'finalizado'];
        if (!validStates.includes(this.estado)) {
            throw new Error('Estado de reserva inválido');
        }

        // Validar número de participantes (máximo 20)
        if (this.participantes > 20) {
            throw new Error('El número máximo de participantes es 20');
        }
    }
}

module.exports = ReservationDTO;