/**
 * Script de prueba para verificar las rutas de fechas prohibidas
 * Ejecutar: node test-routes.js
 */

const http = require('http');

const testRoutes = [
    { method: 'GET', path: '/api/reservations/fechas-prohibidas' },
    { method: 'GET', path: '/api/reservations/fechas-prohibidas/todas' },
];

console.log('🧪 Probando rutas de fechas prohibidas...\n');

testRoutes.forEach(route => {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: route.path,
        method: route.method,
    };

    const req = http.request(options, (res) => {
        console.log(`${route.method} ${route.path}`);
        console.log(`Status: ${res.statusCode} ${res.statusCode === 200 ? '✅' : res.statusCode === 401 ? '❌ (Unauthorized)' : '⚠️'}`);
        console.log('---');
    });

    req.on('error', (error) => {
        console.error(`${route.method} ${route.path}`);
        console.error(`Error: ${error.message} ❌`);
        console.log('---');
    });

    req.end();
});

console.log('\nSi ves ❌ (Unauthorized), las rutas aún requieren autenticación.');
console.log('Si ves ✅, las rutas son públicas y funcionan correctamente.\n');
