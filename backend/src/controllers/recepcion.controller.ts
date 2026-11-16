import { Request, Response, NextFunction } from 'express';
import { registrarRecepcionFisica, listRecepciones } from '../services/recepcion.service';
import { sendSuccess } from '../utils/response';

export async function registrarRecepcionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await registrarRecepcionFisica(req.tenant!.id, req.user!.id, req.body);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function listRecepcionesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ordenId = req.query.ordenId as string;
    const recepciones = await listRecepciones(req.tenant!.id, { ordenId });
    sendSuccess(res, recepciones, 200);
  } catch (error) {
    next(error);
  }
}
