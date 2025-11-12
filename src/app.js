require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const authRoutes = require('./auth/routes/auth.routes');
require('./auth/config/passport.config');

// Inicializar configuración de notificaciones push
const vapidConfig = require('./notifications/config/vapid.config');

const app = express();

// Middleware
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesión (necesaria para Passport)
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Inicialización de Passport
app.use(passport.initialize());

// Rutas
app.use('/auth', authRoutes);

// Importar y usar las rutas de usuarios
const userRoutes = require('./users/routes/user.routes');
app.use('/api/users', userRoutes);

// IMPORTANTE: Registrar rutas más específicas ANTES que las genéricas
// Importar y usar las rutas de fechas prohibidas (debe ir ANTES de /api/reservations)
const fechaProhibidaRoutes = require('./reservations/routes/fechaProhibida.routes');
app.use('/api/reservations/fechas-prohibidas', fechaProhibidaRoutes);

// Importar y usar las rutas de reservas (ruta más genérica)
const reservationRoutes = require('./reservations/routes/reservation.routes');
app.use('/api/reservations', reservationRoutes);

// Importar y usar las rutas de áreas
const areaRoutes = require('./sports-areas/routes/area.routes');
app.use('/api/areas', areaRoutes);

// Importar y usar las rutas de dashboard
const dashboardRoutes = require('./dashboard/routes/dashboard.routes');
app.use('/api/dashboard', dashboardRoutes);

// Importar y usar las rutas de reportes
const reportRoutes = require('./reports/routes/report.routes');
app.use('/api/reports', reportRoutes);

// Importar y usar las rutas de notificaciones
const notificationRoutes = require('./notifications/routes/notification.routes');
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;

// Inicializar VAPID y luego iniciar el servidor
vapidConfig.initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`✅ Notificaciones Push habilitadas`);
    });
  })
  .catch(error => {
    console.error('❌ Error al inicializar VAPID:', error);
    process.exit(1);
  });