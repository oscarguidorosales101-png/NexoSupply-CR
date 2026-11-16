import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error';
import { sendError } from '../utils/response';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Errores de Dominio Conocidos (AppError)
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // 2. Errores de Validación Zod
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    sendError(res, 'Error de validación en la solicitud', 422, 'VALIDATION_ERROR', formattedErrors);
    return;
  }

  // 3. Errores Conocidos de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || ['campo_duplicado'];
      sendError(res, `Ya existe un registro con el mismo valor para: ${target.join(', ')}`, 409, 'DUPLICATE_ENTRY', {
        fields: target,
      });
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'El registro solicitado no existe o fue eliminado', 404, 'RECORD_NOT_FOUND');
      return;
    }
    if (err.code === 'P2003') {
      sendError(res, 'Operación restringida por integridad referencial (claves foráneas activas)', 409, 'FOREIGN_KEY_VIOLATION');
      return;
    }
  }

  // 4. Error no controlado
  console.error('[UNHANDLED_ERROR]', err);
  const message = env.NODE_ENV === 'production' ? 'Ocurrió un error interno en el servidor' : err.message;
  sendError(res, message, 500, 'INTERNAL_SERVER_ERROR', env.NODE_ENV === 'development' ? err.stack : undefined);
}
