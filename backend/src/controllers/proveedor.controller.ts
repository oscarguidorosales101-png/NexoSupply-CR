import { Request, Response, NextFunction } from 'express';
import {
  listProveedores,
  getProveedorById,
  createProveedor,
  updateProveedor,
  addContactoProveedor,
} from '../services/proveedor.service';
import { sendSuccess } from '../utils/response';

export async function listProveedoresHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activo = req.query.activo !== undefined ? req.query.activo === 'true' : undefined;
    const search = req.query.search as string;
    const proveedores = await listProveedores(req.tenant!.id, { activo, search });
    sendSuccess(res, proveedores, 200);
  } catch (error) {
    next(error);
  }
}

export async function getProveedorHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const proveedor = await getProveedorById(req.tenant!.id, id);
    sendSuccess(res, proveedor, 200);
  } catch (error) {
    next(error);
  }
}

export async function createProveedorHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const proveedor = await createProveedor(req.tenant!.id, req.user!.id, req.body);
    sendSuccess(res, proveedor, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateProveedorHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const proveedor = await updateProveedor(req.tenant!.id, id, req.user!.id, req.body);
    sendSuccess(res, proveedor, 200);
  } catch (error) {
    next(error);
  }
}

export async function addContactoHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const contacto = await addContactoProveedor(req.tenant!.id, id, req.body);
    sendSuccess(res, contacto, 201);
  } catch (error) {
    next(error);
  }
}
