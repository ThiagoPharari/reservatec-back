const dashboardService = require('../services/dashboard.service');

class DashboardController {
    // Obtener estadísticas del dashboard
    async getStats(req, res) {
        try {
            const stats = await dashboardService.getStats();
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas'
            });
        }
    }

    // Exportar estadísticas a Excel
    async exportToExcel(req, res) {
        try {
            const workbook = await dashboardService.generateExcel();
            
            // Configurar headers para descarga
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=estadisticas-${new Date().toISOString().split('T')[0]}.xlsx`
            );
            
            // Escribir el archivo en la respuesta
            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('Error exportando a Excel:', error);
            res.status(500).json({
                success: false,
                message: 'Error al exportar a Excel'
            });
        }
    }

    // Exportar estadísticas a PDF
    async exportToPDF(req, res) {
        try {
            const pdfDoc = await dashboardService.generatePDF();
            
            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=estadisticas-${new Date().toISOString().split('T')[0]}.pdf`
            );
            
            // Pipe el PDF a la respuesta
            pdfDoc.pipe(res);
            pdfDoc.end();
        } catch (error) {
            console.error('Error exportando a PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Error al exportar a PDF'
            });
        }
    }
}

module.exports = new DashboardController();
