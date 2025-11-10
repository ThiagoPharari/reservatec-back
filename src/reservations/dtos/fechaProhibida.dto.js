/**
 * @class FechaProhibidaDTO
 * @description DTO para validación de fechas prohibidas
 */
class FechaProhibidaDTO {
    constructor(data) {
        this.nombre_evento = data.nombre_evento || data.evento;
        this.fecha_inicio = data.fecha_inicio;
        this.fecha_fin = data.fecha_fin;
        this.descripcion = data.descripcion || '';
        this.activo = data.activo !== undefined ? data.activo : true;
    }

    validate() {
        const errors = [];

        // Validar nombre del evento
        if (!this.nombre_evento || this.nombre_evento.trim() === '') {
            errors.push('El nombre del evento es requerido');
        }

        if (this.nombre_evento && this.nombre_evento.length > 255) {
            errors.push('El nombre del evento no puede exceder 255 caracteres');
        }

        // Validar fecha de inicio
        if (!this.fecha_inicio) {
            errors.push('La fecha de inicio es requerida');
        } else if (!this.isValidDate(this.fecha_inicio)) {
            errors.push('La fecha de inicio no es válida');
        }

        // Validar fecha de fin
        if (!this.fecha_fin) {
            errors.push('La fecha de fin es requerida');
        } else if (!this.isValidDate(this.fecha_fin)) {
            errors.push('La fecha de fin no es válida');
        }

        // Validar que fecha_fin >= fecha_inicio
        if (this.fecha_inicio && this.fecha_fin) {
            const inicio = new Date(this.fecha_inicio);
            const fin = new Date(this.fecha_fin);
            
            if (fin < inicio) {
                errors.push('La fecha de fin debe ser mayor o igual a la fecha de inicio');
            }

            // Validar que no sea un rango muy largo (máximo 1 año)
            const unAnoEnMs = 365 * 24 * 60 * 60 * 1000;
            if (fin - inicio > unAnoEnMs) {
                errors.push('El rango de fechas no puede exceder 1 año');
            }
        }

        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        return true;
    }

    isValidDate(dateString) {
        // Si ya es un string en formato YYYY-MM-DD, validarlo directamente
        if (typeof dateString === 'string') {
            const match = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (match) {
                const [, year, month, day] = match;
                const y = parseInt(year);
                const m = parseInt(month);
                const d = parseInt(day);
                
                // Validar rangos
                if (m < 1 || m > 12) return false;
                if (d < 1 || d > 31) return false;
                
                // Crear fecha para validación completa
                const date = new Date(y, m - 1, d);
                return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
            }
        }
        
        // Si es un objeto Date
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    // Formatear fecha al formato YYYY-MM-DD para MySQL
    formatearFecha(fecha) {
        if (!fecha) return null;
        
        // Si ya es un string en formato YYYY-MM-DD, devolverlo tal cual
        if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return fecha;
        }
        
        // Si es un objeto Date, formatearlo
        const date = new Date(fecha);
        if (isNaN(date)) return null;
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    getData() {
        return {
            nombre_evento: this.nombre_evento.trim(),
            fecha_inicio: this.formatearFecha(this.fecha_inicio),
            fecha_fin: this.formatearFecha(this.fecha_fin),
            descripcion: this.descripcion.trim(),
            activo: this.activo
        };
    }
}

module.exports = FechaProhibidaDTO;
