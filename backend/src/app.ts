import express, { Application, Request, Response } from 'express';
import './types/express';
import cookieParser from 'cookie-parser';
import { corsOptions, helmetConfig, apiRateLimiter } from './config/security';
import { errorHandler } from './middlewares/error.middleware';
import apiRouter from './routes';
import { sendSuccess } from './utils/response';

export function createApp(): Application {
  const app = express();

  // 1. Cabeceras de seguridad
  app.use(helmetConfig);

  // 2. Control de acceso CORS
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // 3. Rate limiting global para protección anti DoS
  app.use('/api', apiRateLimiter);

  // 4. Verificación de salud (Health check)
  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'UP',
      plataforma: 'NexoSupply CR Backend Enterprise',
      timestamp: new Date().toISOString(),
      ambiente: process.env.NODE_ENV || 'development',
    });
  });

  // 5. Montaje de API versión 1
  app.use('/api/v1', apiRouter);

  // 6. Manejador de rutas no encontradas (404)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: 'La ruta de API solicitada no existe',
      },
    });
  });

  // 7. Manejador centralizado de errores
  app.use(errorHandler);

  return app;
}
