import { Request, Response, NextFunction } from 'express';
import { listAlertasRiesgo, markAlertaResolved, detectOperationalRisks } from '../services/riesgo.service';
import { sendSuccess } from '../utils/response';
import { NivelSeveridadAlerta } from '@prisma/client';

export async function listAlertasHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resuelta = req.query.resuelta !== undefined ? req.query.resuelta === 'true' : undefined;
    const nivel = req.query.nivel as NivelSeveridadAlerta;
    const alertas = await listAlertasRiesgo(req.tenant!.id, { resuelta, nivel });
    sendSuccess(res, alertas, 200);
  } catch (error) {
    next(error);
  }
}

export async function resolveAlertaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const alerta = await markAlertaResolved(req.tenant!.id, id);
    sendSuccess(res, alerta, 200);
  } catch (error) {
    next(error);
  }
}

export async function runRiskScanHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scanResult = await detectOperationalRisks(req.tenant!.id);
    sendSuccess(res, scanResult, 200);
  } catch (error) {
    next(error);
  }
}
