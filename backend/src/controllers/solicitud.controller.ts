import { Request, Response, NextFunction } from 'express';
import {
  listSolicitudes,
  getSolicitudById,
  createSolicitud,
  decideAprobacionSolicitud,
} from '../services/solicitud.service';
import { sendSuccess } from '../utils/response';
import { EstadoSolicitudCompra } from '@prisma/client';

export async function listSolicitudesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const estado = req.query.estado as EstadoSolicitudCompra;
    const solicitudes = await listSolicitudes(req.tenant!.id, { estado });
    sendSuccess(res, solicitudes, 200);
  } catch (error) {
    next(error);
  }
}

export async function getSolicitudHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const solicitud = await getSolicitudById(req.tenant!.id, id);
    sendSuccess(res, solicitud, 200);
  } catch (error) {
    next(error);
  }
}

export async function createSolicitudHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const solicitud = await createSolicitud(req.tenant!.id, req.user!.id, req.body);
    sendSuccess(res, solicitud, 201);
  } catch (error) {
    next(error);
  }
}

export async function decideAprobacionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { decision, comentario } = req.body;
    const result = await decideAprobacionSolicitud(
      req.tenant!.id,
      id,
      req.user!.id,
      decision,
      comentario
    );
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}
