import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './env';

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir solicitudes sin origen (como Postman o curl) o que coincidan con la URL del frontend
    const allowedOrigins = [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acceso no permitido por la política CORS de NexoSupply CR'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Empresa-Id', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
};

export const helmetConfig = helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 solicitudes por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas solicitudes desde esta dirección IP. Por favor intente más tarde.',
    },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // 30 intentos por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Demasiados intentos de autenticación. Su acceso temporal ha sido restringido por seguridad.',
    },
  },
});
