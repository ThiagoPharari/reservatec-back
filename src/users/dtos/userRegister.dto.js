class UserRegisterDTO {
    constructor(data, isUpdate = false) {
        this.nombre = data.nombre;
        this.apellido = data.apellido;
        this.dni = data.dni;
        this.codigo = data.codigo;
        this.id_carrera = data.id_carrera;
        this.condicion_med = data.condicion_med;
        this.correo = data.correo;
        this.isUpdate = isUpdate;
    }

    validate() {
        console.log('Validando datos:', {
            nombre: this.nombre,
            apellido: this.apellido,
            dni: this.dni,
            codigo: this.codigo,
            id_carrera: this.id_carrera,
            correo: this.correo,
            tipoCorreo: typeof this.correo
        });

        // Validar campos requeridos individualmente para identificar cuál falta
        if (!this.nombre) throw new Error('El nombre es requerido');
        if (!this.apellido) throw new Error('El apellido es requerido');
        if (!this.dni) throw new Error('El DNI es requerido');
        if (!this.codigo) throw new Error('El código es requerido');
        if (!this.id_carrera) throw new Error('La carrera es requerida');
        if (!this.correo) throw new Error('El correo es requerido');

        // Validar formato del DNI
        if (this.dni.length < 8) {
            throw new Error('DNI inválido: debe tener 8 dígitos');
        }

        // Validar formato del código
        if (this.codigo.length < 6) {
            throw new Error('Código inválido: debe tener al menos 6 caracteres');
        }

        // Validar formato del correo
        if (!this.validateEmail(this.correo)) {
            console.error('Correo inválido:', this.correo);
            throw new Error('Correo electrónico inválido');
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

module.exports = UserRegisterDTO;