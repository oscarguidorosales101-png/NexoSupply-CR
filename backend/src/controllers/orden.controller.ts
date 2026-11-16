import { Request, Response, NextFunction } from 'express';
import {
  listOrdenes,
  getOrdenById,
  createOrdenFromSolicitud,
  createOrdenDirecta,
} from '../services/orden.service';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../errors/app-error';
import { EstadoOrdenCompra } from '@prisma/client';

export async function listOrdenesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const estado = req.query.estado as EstadoOrdenCompra;
    const proveedorId = req.user?.proveedorId || (req.query.proveedorId as string);
    const ordenes = await listOrdenes(req.tenant!.id, { estado, proveedorId });
    sendSuccess(res, ordenes, 200);
  } catch (error) {
    next(error);
  }
}

export async function getOrdenHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const orden = await getOrdenById(req.tenant!.id, id);
    if (req.user?.proveedorId && orden.proveedor_id !== req.user.proveedorId) {
      throw new NotFoundError('La orden solicitada no pertenece a este proveedor');
    }
    sendSuccess(res, orden, 200);
  } catch (error) {
    next(error);
  }
}

export async function createOrdenFromSolicitudHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const solicitudId = req.params.solicitudId as string;
    const orden = await createOrdenFromSolicitud(
      req.tenant!.id,
      req.user!.id,
      solicitudId,
      req.body
    );
    sendSuccess(res, orden, 201);
  } catch (error) {
    next(error);
  }
}

export async function createOrdenDirectaHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orden = await createOrdenDirecta(req.tenant!.id, req.user!.id, req.body);
    sendSuccess(res, orden, 201);
  } catch (error) {
    next(error);
  }
}
