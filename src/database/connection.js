const mysql = require('mysql2/promise');

// Configuración del pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
});

// Función para probar la conexión al iniciar el servidor
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Database connection has been established successfully.');
        connection.release();
    } catch (error) {
        console.error('Unable to connect to the database:', error.message);
    }
};

// Ejecutar prueba de conexión
testConnection();

module.exports = pool;