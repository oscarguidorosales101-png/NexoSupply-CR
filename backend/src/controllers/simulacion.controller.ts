import { Request, Response, NextFunction } from 'express';
import { runContinuidadSimulation, listSimulaciones } from '../services/simulacion.service';
import { sendSuccess } from '../utils/response';

export async function runSimulacionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const simulacion = await runContinuidadSimulation(req.tenant!.id, req.user!.id, req.body);
    sendSuccess(res, simulacion, 201);
  } catch (error) {
    next(error);
  }
}

export async function listSimulacionesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const simulaciones = await listSimulaciones(req.tenant!.id);
    sendSuccess(res, simulaciones, 200);
  } catch (error) {
    next(error);
  }
}
