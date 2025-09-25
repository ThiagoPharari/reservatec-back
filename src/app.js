require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const authRoutes = require('./auth/routes/auth.routes');
require('./auth/config/passport.config');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
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

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});