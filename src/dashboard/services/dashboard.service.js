const db = require('../../database/connection');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class DashboardService {
    // Obtener todas las estadísticas del dashboard
    async getStats() {
        const connection = await db.getConnection();
        try {
            // Total de reservas
            const [totalReservas] = await connection.query(`
                SELECT COUNT(*) as total
                FROM Reservas
            `);

            // Reservas del mes actual
            const [reservasMesActual] = await connection.query(`
                SELECT COUNT(*) as total
                FROM Reservas
                WHERE MONTH(fecha) = MONTH(CURRENT_DATE())
                AND YEAR(fecha) = YEAR(CURRENT_DATE())
            `);

            // Reservas del mes anterior
            const [reservasMesAnterior] = await connection.query(`
                SELECT COUNT(*) as total
                FROM Reservas
                WHERE MONTH(fecha) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
                AND YEAR(fecha) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            `);

            // Calcular variación de reservas
            const totalMesActual = reservasMesActual[0].total;
            const totalMesAnterior = reservasMesAnterior[0].total;
            const variacionReservas = totalMesAnterior > 0 
                ? Math.round(((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100)
                : 0;

            // Total de usuarios activos
            const [usuariosActivos] = await connection.query(`
                SELECT COUNT(*) as total
                FROM Usuarios
                WHERE activo = TRUE
            `);

            // Usuarios activos del mes anterior (simulado - puedes agregar fecha_registro si quieres)
            const variacionUsuarios = 8; // Simulado por ahora

            // Área más popular
            const [areaMasPopular] = await connection.query(`
                SELECT 
                    a.nombre,
                    COUNT(r.id_reserva) as total_reservas,
                    ROUND((COUNT(r.id_reserva) * 100.0 / (SELECT COUNT(*) FROM Reservas)), 0) as porcentaje
                FROM Areas a
                LEFT JOIN Reservas r ON a.id_area = r.id_area
                GROUP BY a.id_area, a.nombre
                ORDER BY total_reservas DESC
                LIMIT 1
            `);

            // Reportes (simulado - puedes crear una tabla de reportes después)
            const reportes = 23;
            const variacionReportes = -15;

            // Reservas por día de la semana
            const [reservasSemanales] = await connection.query(`
                SELECT 
                    CASE DAYOFWEEK(fecha)
                        WHEN 1 THEN 'Dom'
                        WHEN 2 THEN 'Lun'
                        WHEN 3 THEN 'Mar'
                        WHEN 4 THEN 'Mié'
                        WHEN 5 THEN 'Jue'
                        WHEN 6 THEN 'Vie'
                        WHEN 7 THEN 'Sáb'
                    END as dia,
                    DAYOFWEEK(fecha) as dia_num,
                    COUNT(*) as cantidad
                FROM Reservas
                WHERE fecha >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
                GROUP BY DAYOFWEEK(fecha), dia
                ORDER BY dia_num
            `);

            // Reservas por mes (últimos 6 meses)
            const [reservasMensuales] = await connection.query(`
                SELECT 
                    CASE MONTH(fecha)
                        WHEN 1 THEN 'Ene'
                        WHEN 2 THEN 'Feb'
                        WHEN 3 THEN 'Mar'
                        WHEN 4 THEN 'Abr'
                        WHEN 5 THEN 'May'
                        WHEN 6 THEN 'Jun'
                        WHEN 7 THEN 'Jul'
                        WHEN 8 THEN 'Ago'
                        WHEN 9 THEN 'Sep'
                        WHEN 10 THEN 'Oct'
                        WHEN 11 THEN 'Nov'
                        WHEN 12 THEN 'Dic'
                    END as mes,
                    COUNT(*) as cantidad,
                    MONTH(fecha) as mes_num
                FROM Reservas
                WHERE fecha >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
                GROUP BY YEAR(fecha), MONTH(fecha), mes
                ORDER BY YEAR(fecha), mes_num
            `);

            return {
                totalReservas: totalReservas[0].total,
                variacionReservas: variacionReservas,
                usuariosActivos: usuariosActivos[0].total,
                variacionUsuarios: variacionUsuarios,
                areaMasPopular: {
                    nombre: areaMasPopular[0]?.nombre || 'N/A',
                    porcentaje: areaMasPopular[0]?.porcentaje || 0
                },
                reportes: reportes,
                variacionReportes: variacionReportes,
                reservasSemanales: reservasSemanales,
                reservasMensuales: reservasMensuales
            };

        } finally {
            connection.release();
        }
    }

    // Generar archivo Excel con estadísticas
    async generateExcel() {
        const stats = await this.getStats();
        const workbook = new ExcelJS.Workbook();
        
        // Metadatos
        workbook.creator = 'ReservaTec';
        workbook.created = new Date();
        
        // Hoja 1: Resumen General
        const resumenSheet = workbook.addWorksheet('Resumen General', {
            properties: { tabColor: { argb: '3B82F6' } }
        });
        
        // Título
        resumenSheet.mergeCells('A1:D1');
        resumenSheet.getCell('A1').value = 'ESTADÍSTICAS DEL SISTEMA DE RESERVAS';
        resumenSheet.getCell('A1').font = { size: 16, bold: true, color: { argb: '1E3A8A' } };
        resumenSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        resumenSheet.getRow(1).height = 30;
        
        // Fecha del reporte
        resumenSheet.mergeCells('A2:D2');
        resumenSheet.getCell('A2').value = `Fecha: ${new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}`;
        resumenSheet.getCell('A2').font = { italic: true };
        resumenSheet.getCell('A2').alignment = { horizontal: 'center' };
        
        // Espacio
        resumenSheet.addRow([]);
        
        // Métricas principales
        resumenSheet.addRow(['MÉTRICAS PRINCIPALES']);
        resumenSheet.getCell('A4').font = { bold: true, size: 12 };
        resumenSheet.addRow([]);
        
        // Headers
        const headerRow = resumenSheet.addRow(['Métrica', 'Valor', 'Variación', 'Tendencia']);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '3B82F6' }
        };
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        
        // Datos
        resumenSheet.addRow([
            'Total Reservas', 
            stats.totalReservas,
            `${stats.variacionReservas}%`,
            stats.variacionReservas >= 0 ? '↑ Aumento' : '↓ Disminución'
        ]);
        resumenSheet.addRow([
            'Usuarios Activos',
            stats.usuariosActivos,
            `${stats.variacionUsuarios}%`,
            stats.variacionUsuarios >= 0 ? '↑ Aumento' : '↓ Disminución'
        ]);
        resumenSheet.addRow([
            'Área Más Popular',
            stats.areaMasPopular.nombre,
            `${stats.areaMasPopular.porcentaje}%`,
            'Del total'
        ]);
        resumenSheet.addRow([
            'Reportes',
            stats.reportes,
            `${stats.variacionReportes}%`,
            stats.variacionReportes >= 0 ? '↑ Aumento' : '↓ Disminución'
        ]);
        
        // Ajustar anchos de columna
        resumenSheet.getColumn(1).width = 25;
        resumenSheet.getColumn(2).width = 15;
        resumenSheet.getColumn(3).width = 15;
        resumenSheet.getColumn(4).width = 20;
        
        // Hoja 2: Reservas Semanales
        const semanalesSheet = workbook.addWorksheet('Reservas Semanales');
        semanalesSheet.addRow(['Día', 'Cantidad de Reservas']);
        semanalesSheet.getRow(1).font = { bold: true };
        semanalesSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '3B82F6' }
        };
        semanalesSheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        });
        
        stats.reservasSemanales.forEach(item => {
            semanalesSheet.addRow([item.dia, item.cantidad]);
        });
        
        semanalesSheet.getColumn(1).width = 20;
        semanalesSheet.getColumn(2).width = 20;
        
        // Hoja 3: Reservas Mensuales
        const mensualesSheet = workbook.addWorksheet('Reservas Mensuales');
        mensualesSheet.addRow(['Mes', 'Cantidad de Reservas']);
        mensualesSheet.getRow(1).font = { bold: true };
        mensualesSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '3B82F6' }
        };
        mensualesSheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        });
        
        stats.reservasMensuales.forEach(item => {
            mensualesSheet.addRow([item.mes, item.cantidad]);
        });
        
        mensualesSheet.getColumn(1).width = 20;
        mensualesSheet.getColumn(2).width = 20;
        
        return workbook;
    }

    // Generar archivo PDF con estadísticas
    async generatePDF() {
        const stats = await this.getStats();
        const doc = new PDFDocument({ margin: 50 });
        
        // Título
        doc.fontSize(20)
           .fillColor('#1E3A8A')
           .text('ESTADÍSTICAS DEL SISTEMA DE RESERVAS', { align: 'center' });
        
        doc.moveDown();
        doc.fontSize(10)
           .fillColor('#6B7280')
           .text(`Fecha: ${new Date().toLocaleDateString('es-ES', { 
               year: 'numeric', 
               month: 'long', 
               day: 'numeric' 
           })}`, { align: 'center' });
        
        doc.moveDown(2);
        
        // Métricas Principales
        doc.fontSize(14)
           .fillColor('#1F2937')
           .text('MÉTRICAS PRINCIPALES', { underline: true });
        
        doc.moveDown();
        
        // Total Reservas
        doc.fontSize(12)
           .fillColor('#374151')
           .text('Total Reservas: ', { continued: true })
           .fillColor('#000000')
           .text(stats.totalReservas.toLocaleString(), { continued: true })
           .fillColor(stats.variacionReservas >= 0 ? '#10B981' : '#EF4444')
           .text(` (${stats.variacionReservas >= 0 ? '+' : ''}${stats.variacionReservas}%)`);
        
        doc.moveDown();
        
        // Usuarios Activos
        doc.fillColor('#374151')
           .text('Usuarios Activos: ', { continued: true })
           .fillColor('#000000')
           .text(stats.usuariosActivos, { continued: true })
           .fillColor(stats.variacionUsuarios >= 0 ? '#10B981' : '#EF4444')
           .text(` (${stats.variacionUsuarios >= 0 ? '+' : ''}${stats.variacionUsuarios}%)`);
        
        doc.moveDown();
        
        // Área más popular
        doc.fillColor('#374151')
           .text('Área Más Popular: ', { continued: true })
           .fillColor('#000000')
           .text(`${stats.areaMasPopular.nombre} (${stats.areaMasPopular.porcentaje}%)`);
        
        doc.moveDown();
        
        // Reportes
        doc.fillColor('#374151')
           .text('Reportes: ', { continued: true })
           .fillColor('#000000')
           .text(stats.reportes, { continued: true })
           .fillColor(stats.variacionReportes >= 0 ? '#EF4444' : '#10B981')
           .text(` (${stats.variacionReportes >= 0 ? '+' : ''}${stats.variacionReportes}%)`);
        
        doc.moveDown(2);
        
        // Reservas Semanales
        doc.fontSize(14)
           .fillColor('#1F2937')
           .text('RESERVAS SEMANALES', { underline: true });
        
        doc.moveDown();
        doc.fontSize(10);
        
        stats.reservasSemanales.forEach(item => {
            doc.fillColor('#374151')
               .text(`${item.dia}: `, { continued: true })
               .fillColor('#000000')
               .text(item.cantidad);
        });
        
        doc.moveDown(2);
        
        // Reservas Mensuales
        doc.fontSize(14)
           .fillColor('#1F2937')
           .text('RESERVAS MENSUALES (Últimos 6 meses)', { underline: true });
        
        doc.moveDown();
        doc.fontSize(10);
        
        stats.reservasMensuales.forEach(item => {
            doc.fillColor('#374151')
               .text(`${item.mes}: `, { continued: true })
               .fillColor('#000000')
               .text(item.cantidad);
        });
        
        // Pie de página
        doc.fontSize(8)
           .fillColor('#9CA3AF')
           .text(
               'Generado por ReservaTec - Sistema de Gestión de Reservas Deportivas',
               50,
               doc.page.height - 50,
               { align: 'center' }
           );
        
        return doc;
    }
}

module.exports = new DashboardService();
