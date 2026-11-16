import { Request, Response, NextFunction } from 'express';
import {
  listAlertasRiesgo,
  markAlertaResolved,
  updateAlertaEstado,
  detectOperationalRisks,
} from '../services/riesgo.service';
import { sendSuccess } from '../utils/response';
import { NivelSeveridadAlerta } from '@prisma/client';

export async function listAlertasHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resuelta = req.query.resuelta !== undefined ? req.query.resuelta === 'true' : undefined;
    const nivel = req.query.nivel as NivelSeveridadAlerta;
    const estado = req.query.estado as string;
    const alertas = await listAlertasRiesgo(req.tenant!.id, { resuelta, nivel, estado });
    sendSuccess(res, alertas, 200);
  } catch (error) {
    next(error);
  }
}

export async function resolveAlertaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { accionResolucion } = req.body;
    const alerta = await markAlertaResolved(req.tenant!.id, id, req.user!.id, accionResolucion);
    sendSuccess(res, alerta, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateEstadoAlertaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { estado, accionResolucion } = req.body;
    const alerta = await updateAlertaEstado(req.tenant!.id, id, req.user!.id, estado, accionResolucion);
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
