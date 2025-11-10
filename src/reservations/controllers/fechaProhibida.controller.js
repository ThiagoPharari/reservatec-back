const FechaProhibidaService = require('../services/fechaProhibida.service');

const fechaProhibidaService = new FechaProhibidaService();

/**
 * Subir y procesar archivo Excel con fechas prohibidas
 */
const subirExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No se proporcionó ningún archivo'
            });
        }

        // Validar que sea un archivo Excel
        const validMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel' // .xls
        ];

        if (!validMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                error: 'El archivo debe ser un archivo Excel (.xlsx o .xls)'
            });
        }

        // Procesar el archivo
        const resultado = await fechaProhibidaService.procesarExcel(req.file.buffer);

        res.status(200).json({
            mensaje: 'Archivo procesado exitosamente',
            data: resultado
        });
    } catch (error) {
        console.error('Error subiendo Excel:', error);
        res.status(500).json({
            error: error.message || 'Error procesando el archivo Excel'
        });
    }
};

/**
 * Obtener todas las fechas prohibidas
 */
const obtenerFechasProhibidas = async (req, res) => {
    try {
        const fechas = await fechaProhibidaService.obtenerFechasProhibidas();
        
        res.status(200).json({
            mensaje: 'Fechas prohibidas obtenidas exitosamente',
            data: fechas
        });
    } catch (error) {
        console.error('Error obteniendo fechas prohibidas:', error);
        res.status(500).json({
            error: 'Error obteniendo las fechas prohibidas'
        });
    }
};

/**
 * Guardar múltiples fechas prohibidas (batch)
 */
const guardarFechasProhibidas = async (req, res) => {
    try {
        const { eventos } = req.body;

        if (!eventos || !Array.isArray(eventos) || eventos.length === 0) {
            return res.status(400).json({
                error: 'Se debe proporcionar un array de eventos'
            });
        }

        const resultados = await fechaProhibidaService.guardarFechasProhibidas(eventos);

        res.status(201).json({
            mensaje: `${resultados.length} eventos guardados exitosamente`,
            data: resultados
        });
    } catch (error) {
        console.error('Error guardando fechas prohibidas:', error);
        res.status(500).json({
            error: error.message || 'Error guardando las fechas prohibidas'
        });
    }
};

/**
 * Eliminar una fecha prohibida
 */
const eliminarFechaProhibida = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({
                error: 'ID inválido'
            });
        }

        const resultado = await fechaProhibidaService.eliminarFechaProhibida(id);

        res.status(200).json({
            mensaje: resultado.message,
            data: { id }
        });
    } catch (error) {
        console.error('Error eliminando fecha prohibida:', error);
        
        if (error.message === 'Fecha prohibida no encontrada') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({
            error: 'Error eliminando la fecha prohibida'
        });
    }
};

/**
 * Validar si una fecha específica está prohibida
 */
const validarFecha = async (req, res) => {
    try {
        const { fecha } = req.query;

        if (!fecha) {
            return res.status(400).json({
                error: 'Se debe proporcionar una fecha'
            });
        }

        // Validar formato de fecha
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(fecha)) {
            return res.status(400).json({
                error: 'Formato de fecha inválido. Use YYYY-MM-DD'
            });
        }

        const resultado = await fechaProhibidaService.validarFechaEnRango(fecha);

        res.status(200).json({
            mensaje: 'Validación completada',
            data: resultado
        });
    } catch (error) {
        console.error('Error validando fecha:', error);
        res.status(500).json({
            error: 'Error validando la fecha'
        });
    }
};

/**
 * Obtener fechas prohibidas en un rango
 */
const obtenerFechasEnRango = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({
                error: 'Se deben proporcionar fechaInicio y fechaFin'
            });
        }

        // Validar formato de fechas
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(fechaInicio) || !fechaRegex.test(fechaFin)) {
            return res.status(400).json({
                error: 'Formato de fecha inválido. Use YYYY-MM-DD'
            });
        }

        const fechas = await fechaProhibidaService.obtenerFechasProhibidasEnRango(fechaInicio, fechaFin);

        res.status(200).json({
            mensaje: 'Fechas obtenidas exitosamente',
            data: fechas
        });
    } catch (error) {
        console.error('Error obteniendo fechas en rango:', error);
        res.status(500).json({
            error: 'Error obteniendo las fechas en el rango especificado'
        });
    }
};

/**
 * Obtener todas las fechas prohibidas individuales (expandidas desde rangos)
 */
const obtenerTodasLasFechas = async (req, res) => {
    try {
        const fechas = await fechaProhibidaService.obtenerTodasLasFechasProhibidas();

        res.status(200).json({
            mensaje: 'Fechas individuales obtenidas exitosamente',
            data: fechas,
            total: fechas.length
        });
    } catch (error) {
        console.error('Error obteniendo todas las fechas:', error);
        res.status(500).json({
            error: 'Error obteniendo las fechas individuales'
        });
    }
};

module.exports = {
    subirExcel,
    obtenerFechasProhibidas,
    guardarFechasProhibidas,
    eliminarFechaProhibida,
    validarFecha,
    obtenerFechasEnRango,
    obtenerTodasLasFechas
};
