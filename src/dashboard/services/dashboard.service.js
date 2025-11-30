const db = require('../../database/connection');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class DashboardService {
    // Obtener todas las estadísticas del dashboard
    async getStats() {
        const connection = await db.getConnection();
        try {
            // ========================================
            // DATOS PARA EL PANEL DEL ENCARGADO
            // ========================================

            // 1. Reservas activas (estado 'aceptado' para hoy o futuras)
            const [reservasActivas] = await connection.query(`
                SELECT COUNT(*) as total
                FROM reservas
                WHERE estado = 'aceptado'
                AND fecha >= CURDATE()
            `);

            // 2. Reservas pendientes (estado 'pendiente')
            const [reservasPendientes] = await connection.query(`
                SELECT COUNT(*) as total
                FROM reservas
                WHERE estado = 'pendiente'
            `);

            // 3. Total de usuarios (sin permisos de encargado = sin estar en tabla administradores)
            const [totalUsuarios] = await connection.query(`
                SELECT COUNT(*) as total
                FROM usuarios
            `);

            // 4. Áreas disponibles (habilitadas y sin reservas activas en horarios de hoy)
            const [areasDisponibles] = await connection.query(`
                SELECT COUNT(DISTINCT a.id_area) as total
                FROM areas a
                WHERE a.habilitada = TRUE
                AND (
                    a.fecha_fin_deshabilitacion IS NULL 
                    OR a.fecha_fin_deshabilitacion < NOW()
                )
            `);

            // 5. Reservas recientes del día (últimas 10)
            const [reservasRecientes] = await connection.query(`
                SELECT 
                    r.id_reserva,
                    r.fecha,
                    r.estado,
                    a.nombre as area_nombre,
                    u.nombre as usuario_nombre,
                    u.apellido as usuario_apellido,
                    h.hora_inicio,
                    h.hora_fin,
                    r.participantes,
                    DATE_FORMAT(r.fecha, '%d/%m/%Y') as fecha_formato,
                    CASE 
                        WHEN r.estado = 'aceptado' THEN 'Activa'
                        WHEN r.estado = 'pendiente' THEN 'Pendiente'
                        WHEN r.estado = 'rechazado' THEN 'Rechazada'
                        WHEN r.estado = 'cancelado' THEN 'Cancelada'
                        ELSE r.estado
                    END as estado_texto
                FROM reservas r
                INNER JOIN areas a ON r.id_area = a.id_area
                INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
                INNER JOIN horarios h ON r.id_horario = h.id_horario
                WHERE r.fecha = CURDATE()
                ORDER BY h.hora_inicio DESC
                LIMIT 10
            `);

            // 6. Actividad del sistema (últimas acciones)
            const [actividadSistema] = await connection.query(`
                (SELECT 
                    'Nueva reserva creada' as accion,
                    CONCAT(u.nombre, ' ', u.apellido) as usuario,
                    r.fecha as fecha_accion,
                    TIMESTAMPDIFF(MINUTE, r.fecha, NOW()) as minutos_transcurridos
                FROM reservas r
                INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
                WHERE r.fecha >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
                ORDER BY r.fecha DESC
                LIMIT 3)
                UNION ALL
                (SELECT 
                    CASE 
                        WHEN r.estado = 'rechazado' THEN 'Reserva cancelada'
                        WHEN r.estado = 'aceptado' THEN 'Reserva aprobada'
                        ELSE 'Reserva modificada'
                    END as accion,
                    CONCAT(u.nombre, ' ', u.apellido) as usuario,
                    r.fecha as fecha_accion,
                    TIMESTAMPDIFF(MINUTE, r.fecha, NOW()) as minutos_transcurridos
                FROM reservas r
                INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
                WHERE r.estado IN ('aceptado', 'rechazado')
                AND r.fecha >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
                ORDER BY r.fecha DESC
                LIMIT 2)
                UNION ALL
                (SELECT 
                    'Usuario registrado' as accion,
                    CONCAT(nombre, ' ', apellido) as usuario,
                    NOW() as fecha_accion,
                    TIMESTAMPDIFF(MINUTE, NOW(), NOW()) as minutos_transcurridos
                FROM usuarios
                ORDER BY id_usuario DESC
                LIMIT 2)
                ORDER BY fecha_accion DESC
                LIMIT 5
            `);

            // Formatear actividad del sistema con textos legibles
            const actividadFormateada = actividadSistema.map(item => {
                let tiempoTexto;
                if (item.minutos_transcurridos < 1) {
                    tiempoTexto = 'Hace menos de 1 min';
                } else if (item.minutos_transcurridos < 60) {
                    tiempoTexto = `Hace ${item.minutos_transcurridos} min`;
                } else if (item.minutos_transcurridos < 120) {
                    tiempoTexto = 'Hace 1 hora';
                } else {
                    const horas = Math.floor(item.minutos_transcurridos / 60);
                    tiempoTexto = `Hace ${horas} horas`;
                }

                return {
                    accion: item.accion,
                    usuario: item.usuario,
                    tiempo: tiempoTexto
                };
            });

            // ========================================
            // ESTADÍSTICAS ADICIONALES
            // ========================================

            // Reservas por mes (últimos 6 meses) - para gráficos históricos
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
                FROM reservas
                WHERE fecha >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
                GROUP BY YEAR(fecha), MONTH(fecha), mes
                ORDER BY YEAR(fecha), mes_num
            `);

            return {
                // Datos en tiempo real - panel principal
                reservasActivas: reservasActivas[0].total,
                reservasPendientes: reservasPendientes[0].total,
                totalUsuarios: totalUsuarios[0].total,
                areasDisponibles: areasDisponibles[0].total,
                
                // Actividad reciente
                reservasRecientes: reservasRecientes,
                actividadSistema: actividadFormateada,
                
                // Datos históricos - para gráficos
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
