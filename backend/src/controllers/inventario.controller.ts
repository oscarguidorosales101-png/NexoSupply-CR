import { Request, Response, NextFunction } from 'express';
import {
  getStockOverview,
  getKardexMovements,
  adjustInventoryStock,
  listAlmacenes,
  createAlmacen,
} from '../services/inventario.service';
import { sendSuccess } from '../utils/response';

export async function getStockHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const almacenId = req.query.almacenId as string;
    const bajoMinimo = req.query.bajoMinimo === 'true';
    const stock = await getStockOverview(req.tenant!.id, { almacenId, bajoMinimo });
    sendSuccess(res, stock, 200);
  } catch (error) {
    next(error);
  }
}

export async function getKardexHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productoId = req.query.productoId as string;
    const almacenId = req.query.almacenId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const movements = await getKardexMovements(req.tenant!.id, { productoId, almacenId, limit });
    sendSuccess(res, movements, 200);
  } catch (error) {
    next(error);
  }
}

export async function adjustStockHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adjustInventoryStock(req.tenant!.id, req.user!.id, req.body);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function listAlmacenesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const almacenes = await listAlmacenes(req.tenant!.id);
    sendSuccess(res, almacenes, 200);
  } catch (error) {
    next(error);
  }
}

export async function createAlmacenHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const almacen = await createAlmacen(req.tenant!.id, req.body);
    sendSuccess(res, almacen, 201);
  } catch (error) {
    next(error);
  }
}
