import { Request, Response, NextFunction } from 'express';
import { getDashboardKPIs, listRegistrosAuditoria } from '../services/reporte.service';
import { sendSuccess } from '../utils/response';

export async function getDashboardKPIsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const kpis = await getDashboardKPIs(req.tenant!.id);
    sendSuccess(res, kpis, 200);
  } catch (error) {
    next(error);
  }
}

export async function listAuditoriasHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const auditorias = await listRegistrosAuditoria(req.tenant!.id, limit);
    sendSuccess(res, auditorias, 200);
  } catch (error) {
    next(error);
  }
}
