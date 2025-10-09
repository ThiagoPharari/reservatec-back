class ReservaDTO {
    constructor(data) {
        this.id_area = data.id_area;
        this.id_horario = data.id_horario;
        this.fecha = data.fecha;
        this.participantes = data.participantes;
        this.material = data.material || false;
    }

    validate() {
        const errors = [];

        // Validar id_area
        if (!this.id_area || !Number.isInteger(Number(this.id_area)) || this.id_area <= 0) {
            errors.push('ID de área es requerido y debe ser un número entero positivo');
        }

        // Validar id_horario
        if (!this.id_horario || !Number.isInteger(Number(this.id_horario)) || this.id_horario <= 0) {
            errors.push('ID de horario es requerido y debe ser un número entero positivo');
        }

        // Validar fecha
        if (!this.fecha) {
            errors.push('Fecha es requerida');
        } else {
            const fechaReserva = new Date(this.fecha + 'T00:00:00');
            const fechaHoy = new Date();
            fechaHoy.setHours(0, 0, 0, 0);

            // Debug temporal
            console.log('Fecha reserva:', this.fecha, '-> parsed:', fechaReserva.toISOString());
            console.log('Fecha hoy:', fechaHoy.toISOString());
            console.log('Comparación:', fechaReserva.getTime(), '<', fechaHoy.getTime(), '=', fechaReserva.getTime() < fechaHoy.getTime());

            if (isNaN(fechaReserva.getTime())) {
                errors.push('Fecha debe tener un formato válido (YYYY-MM-DD)');
            } // Temporalmente comentada para pruebas
            // else if (fechaReserva.getTime() < fechaHoy.getTime()) {
            //     errors.push('No se pueden hacer reservas para fechas pasadas');
            // }

            // Validar que no sea más de 30 días en el futuro
            const treintaDias = new Date();
            treintaDias.setDate(treintaDias.getDate() + 30);
            if (fechaReserva > treintaDias) {
                errors.push('No se pueden hacer reservas con más de 30 días de anticipación');
            }
        }

        // Validar participantes
        if (!this.participantes || !Number.isInteger(Number(this.participantes))) {
            errors.push('Número de participantes es requerido y debe ser un número entero');
        } else {
            const numParticipantes = Number(this.participantes);
            if (numParticipantes < 1) {
                errors.push('El número de participantes debe ser al menos 1');
            } else if (numParticipantes > 25) {
                errors.push('El número de participantes no puede exceder 25');
            }
        }

        // Validar material (debe ser booleano)
        if (this.material !== undefined && typeof this.material !== 'boolean') {
            // Intentar convertir string a boolean
            if (this.material === 'true' || this.material === '1') {
                this.material = true;
            } else if (this.material === 'false' || this.material === '0') {
                this.material = false;
            } else {
                errors.push('Material debe ser un valor booleano (true/false)');
            }
        }

        if (errors.length > 0) {
            throw new Error(`Errores de validación: ${errors.join(', ')}`);
        }

        return true;
    }

    // Método para obtener datos limpios
    getData() {
        return {
            id_area: Number(this.id_area),
            id_horario: Number(this.id_horario),
            fecha: this.fecha,
            participantes: Number(this.participantes),
            material: Boolean(this.material)
        };
    }
}

module.exports = ReservaDTO;