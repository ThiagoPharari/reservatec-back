const db = require('../../database/connection');
const ExcelJS = require('exceljs');
const FechaProhibidaDTO = require('../dtos/fechaProhibida.dto');

class FechaProhibidaService {
    /**
     * Procesar archivo Excel y extraer eventos
     * @param {Buffer} buffer - Buffer del archivo Excel
     * @returns {Array} - Array de eventos extraídos
     */
    async procesarExcel(buffer) {
        try {
            console.log('Iniciando procesamiento de Excel...');
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);

            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) {
                throw new Error('El archivo Excel no contiene hojas de trabajo');
            }

            console.log('Hoja de trabajo cargada correctamente');

            const eventos = [];
            const errors = [];

            // Leer encabezados para identificar columnas
            const headerRow = worksheet.getRow(1);
            const headers = {};
            console.log('Leyendo encabezados...');
            
            headerRow.eachCell((cell, colNumber) => {
                const headerValue = cell.value?.toString().toLowerCase().trim();
                console.log(`Columna ${colNumber}: ${headerValue}`);
                if (headerValue) {
                    if (headerValue.includes('evento') || headerValue.includes('nombre')) {
                        headers.evento = colNumber;
                    } else if (headerValue.includes('inicio') || headerValue.includes('desde')) {
                        headers.fecha_inicio = colNumber;
                    } else if (headerValue.includes('fin') || headerValue.includes('hasta')) {
                        headers.fecha_fin = colNumber;
                    }
                }
            });

            console.log('Headers encontrados:', headers);

            // Verificar que se encontraron las columnas necesarias
            if (!headers.evento || !headers.fecha_inicio || !headers.fecha_fin) {
                throw new Error(`El archivo Excel debe contener las columnas: evento, fecha_inicio, fecha_fin. Encontradas: ${JSON.stringify(headers)}`);
            }

            // Procesar cada fila (saltando el encabezado)
            console.log('Procesando filas de datos...');
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Saltar encabezado

                try {
                    const eventoValue = row.getCell(headers.evento).value;
                    const fechaInicioValue = row.getCell(headers.fecha_inicio).value;
                    const fechaFinValue = row.getCell(headers.fecha_fin).value;

                    console.log(`Fila ${rowNumber}:`, {
                        evento: eventoValue,
                        fecha_inicio: fechaInicioValue,
                        fecha_fin: fechaFinValue
                    });

                    // Saltar filas vacías
                    if (!eventoValue && !fechaInicioValue && !fechaFinValue) {
                        console.log(`Fila ${rowNumber}: vacía, saltando`);
                        return;
                    }

                    const nombreEvento = this.extraerValor(eventoValue);
                    const fechaInicio = this.procesarFecha(fechaInicioValue);
                    const fechaFin = this.procesarFecha(fechaFinValue);

                    console.log(`Fila ${rowNumber} procesada:`, {
                        nombre_evento: nombreEvento,
                        fecha_inicio: fechaInicio,
                        fecha_fin: fechaFin
                    });

                    const evento = {
                        nombre_evento: nombreEvento,
                        fecha_inicio: fechaInicio,
                        fecha_fin: fechaFin,
                        fila: rowNumber
                    };

                    // Validar el evento
                    const dto = new FechaProhibidaDTO(evento);
                    dto.validate();

                    eventos.push(dto.getData());
                    console.log(`Fila ${rowNumber}: ✅ Validado correctamente`);
                } catch (error) {
                    console.error(`Fila ${rowNumber}: ❌ Error:`, error.message);
                    errors.push({
                        fila: rowNumber,
                        error: error.message
                    });
                }
            });

            console.log(`Procesamiento completado: ${eventos.length} eventos válidos, ${errors.length} errores`);

            return {
                eventos,
                errors,
                total: eventos.length,
                errores: errors.length
            };
        } catch (error) {
            console.error('Error fatal procesando Excel:', error);
            throw new Error(`Error procesando Excel: ${error.message}`);
        }
    }

    /**
     * Extraer valor de una celda (maneja diferentes tipos)
     */
    extraerValor(cellValue) {
        if (!cellValue) return '';
        
        // Si es un objeto con richText
        if (cellValue.richText) {
            return cellValue.richText.map(part => part.text).join('');
        }
        
        // Si es un objeto con text
        if (cellValue.text) {
            return cellValue.text;
        }
        
        // Si es un valor directo
        return cellValue.toString().trim();
    }

    /**
     * Procesar fecha de Excel (puede venir como número serial o string)
     */
    procesarFecha(cellValue) {
        if (!cellValue) return null;

        // Si es un objeto Date de Excel, convertir a formato YYYY-MM-DD
        // ExcelJS devuelve fechas correctamente, solo extraer componentes UTC
        if (cellValue instanceof Date) {
            const year = cellValue.getUTCFullYear();
            const month = cellValue.getUTCMonth() + 1;
            const day = cellValue.getUTCDate();
            
            const fechaFormateada = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            console.log(`Fecha Date: ${cellValue.toISOString()} -> ${fechaFormateada}`);
            return fechaFormateada;
        }

        // Si es un número (fecha serial de Excel)
        if (typeof cellValue === 'number') {
            // Excel almacena fechas como número de días desde 1900-01-01
            const excelEpoch = new Date(Date.UTC(1900, 0, 1));
            const date = new Date(excelEpoch.getTime() + (cellValue - 2) * 24 * 60 * 60 * 1000);
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            const fechaFormateada = `${year}-${month}-${day}`;
            console.log(`Fecha serial Excel ${cellValue} -> ${fechaFormateada}`);
            return fechaFormateada;
        }

        // Si es un string, intentar parsearlo en múltiples formatos
        if (typeof cellValue === 'string') {
            const fechaStr = cellValue.trim();
            
            // Intentar formato DD/MM/YYYY o MM/DD/YYYY
            const slashMatch = fechaStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (slashMatch) {
                const [, first, second, year] = slashMatch;
                const firstNum = parseInt(first);
                const secondNum = parseInt(second);
                
                let day, month;
                
                // Si el primer número es mayor a 12, es DD/MM/YYYY
                if (firstNum > 12) {
                    day = firstNum;
                    month = secondNum;
                }
                // Si el segundo número es mayor a 12, es MM/DD/YYYY
                else if (secondNum > 12) {
                    day = secondNum;
                    month = firstNum;
                }
                // Si ambos son <= 12, asumir DD/MM/YYYY (formato europeo)
                else {
                    day = firstNum;
                    month = secondNum;
                }
                
                // Crear fecha en formato YYYY-MM-DD directamente para evitar problemas de zona horaria
                const fechaFormateada = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                console.log(`Fecha parseada: ${fechaStr} -> ${fechaFormateada}`);
                return fechaFormateada;
            }

            // Intentar formato YYYY-MM-DD (ya está en el formato correcto)
            const yyyymmddMatch = fechaStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (yyyymmddMatch) {
                const [, year, month, day] = yyyymmddMatch;
                const fechaFormateada = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                console.log(`Fecha parseada: ${fechaStr} -> ${fechaFormateada}`);
                return fechaFormateada;
            }

            // Intentar parseado directo como último recurso
            const date = new Date(fechaStr);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }

        return null;
    }

    /**
     * Obtener todas las fechas prohibidas
     */
    async obtenerFechasProhibidas() {
        const [fechas] = await db.query(`
            SELECT 
                id_fecha_prohibida,
                nombre_evento,
                fecha_inicio,
                fecha_fin,
                descripcion,
                activo,
                fecha_creacion
            FROM fechas_prohibidas
            WHERE activo = TRUE
            ORDER BY fecha_inicio DESC
        `);
        return fechas;
    }

    /**
     * Guardar múltiples fechas prohibidas
     */
    async guardarFechasProhibidas(eventos) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const resultados = [];

            for (const eventoData of eventos) {
                const dto = new FechaProhibidaDTO(eventoData);
                dto.validate();
                const data = dto.getData();

                const [result] = await connection.query(
                    `INSERT INTO fechas_prohibidas 
                    (nombre_evento, fecha_inicio, fecha_fin, descripcion, activo) 
                    VALUES (?, ?, ?, ?, ?)`,
                    [data.nombre_evento, data.fecha_inicio, data.fecha_fin, data.descripcion, data.activo]
                );

                resultados.push({
                    id: result.insertId,
                    nombre_evento: data.nombre_evento
                });
            }

            await connection.commit();
            return resultados;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Eliminar una fecha prohibida
     */
    async eliminarFechaProhibida(id) {
        const [result] = await db.query(
            'DELETE FROM fechas_prohibidas WHERE id_fecha_prohibida = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            throw new Error('Fecha prohibida no encontrada');
        }

        return { message: 'Fecha prohibida eliminada exitosamente' };
    }

    /**
     * Validar si una fecha está en algún rango prohibido
     */
    async validarFechaEnRango(fecha) {
        const [result] = await db.query(`
            SELECT 
                id_fecha_prohibida,
                nombre_evento,
                fecha_inicio,
                fecha_fin
            FROM fechas_prohibidas
            WHERE activo = TRUE
            AND ? BETWEEN fecha_inicio AND fecha_fin
            LIMIT 1
        `, [fecha]);

        if (result.length > 0) {
            return {
                esProhibida: true,
                evento: result[0]
            };
        }

        return {
            esProhibida: false,
            evento: null
        };
    }

    /**
     * Obtener fechas prohibidas en un rango
     */
    async obtenerFechasProhibidasEnRango(fechaInicio, fechaFin) {
        const [fechas] = await db.query(`
            SELECT 
                id_fecha_prohibida,
                nombre_evento,
                fecha_inicio,
                fecha_fin,
                descripcion
            FROM fechas_prohibidas
            WHERE activo = TRUE
            AND (
                (fecha_inicio BETWEEN ? AND ?)
                OR (fecha_fin BETWEEN ? AND ?)
                OR (fecha_inicio <= ? AND fecha_fin >= ?)
            )
            ORDER BY fecha_inicio
        `, [fechaInicio, fechaFin, fechaInicio, fechaFin, fechaInicio, fechaFin]);

        return fechas;
    }

    /**
     * Generar array de fechas prohibidas individuales desde rangos
     */
    async obtenerTodasLasFechasProhibidas() {
        const [rangos] = await db.query(`
            SELECT fecha_inicio, fecha_fin, nombre_evento
            FROM fechas_prohibidas
            WHERE activo = TRUE
        `);

        const fechasProhibidas = [];

        rangos.forEach(rango => {
            // Parsear fechas usando componentes UTC para evitar offset
            const [anioInicio, mesInicio, diaInicio] = rango.fecha_inicio.split('-').map(Number);
            const [anioFin, mesFin, diaFin] = rango.fecha_fin.split('-').map(Number);
            
            const inicio = new Date(Date.UTC(anioInicio, mesInicio - 1, diaInicio));
            const fin = new Date(Date.UTC(anioFin, mesFin - 1, diaFin));
            
            for (let d = new Date(inicio); d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
                const year = d.getUTCFullYear();
                const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                const day = String(d.getUTCDate()).padStart(2, '0');
                const fechaStr = `${year}-${month}-${day}`;
                
                fechasProhibidas.push({
                    fecha: fechaStr,
                    evento: rango.nombre_evento
                });
            }
        });

        return fechasProhibidas;
    }
}

module.exports = FechaProhibidaService;
