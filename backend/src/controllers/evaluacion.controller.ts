import { Request, Response, NextFunction } from 'express';
import {
  calculateSupplierEvaluation,
  listEvaluaciones,
  createIncidencia,
  resolveIncidencia,
  listIncidencias,
} from '../services/evaluacion.service';
import { sendSuccess } from '../utils/response';

export async function runEvaluacionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { proveedorId, periodo } = req.body;
    const evaluacion = await calculateSupplierEvaluation(req.tenant!.id, proveedorId, periodo);
    sendSuccess(res, evaluacion, 200);
  } catch (error) {
    next(error);
  }
}

export async function listEvaluacionesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const proveedorId = req.user?.proveedorId || (req.query.proveedorId as string);
    const evaluaciones = await listEvaluaciones(req.tenant!.id, { proveedorId });
    sendSuccess(res, evaluaciones, 200);
  } catch (error) {
    next(error);
  }
}

export async function createIncidenciaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incidencia = await createIncidencia(req.tenant!.id, req.user!.id, req.body);
    sendSuccess(res, incidencia, 201);
  } catch (error) {
    next(error);
  }
}

export async function resolveIncidenciaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const incidencia = await resolveIncidencia(req.tenant!.id, id, req.user!.id, req.body);
    sendSuccess(res, incidencia, 200);
  } catch (error) {
    next(error);
  }
}

export async function listIncidenciasHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const proveedorId = req.user?.proveedorId || (req.query.proveedorId as string);
    const resuelta = req.query.resuelta !== undefined ? req.query.resuelta === 'true' : undefined;
    const incidencias = await listIncidencias(req.tenant!.id, { proveedorId, resuelta });
    sendSuccess(res, incidencias, 200);
  } catch (error) {
    next(error);
  }
}
