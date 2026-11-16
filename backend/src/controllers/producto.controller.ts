import { Request, Response, NextFunction } from 'express';
import {
  listProductos,
  getProductoById,
  createProducto,
  updateProducto,
  linkProductoProveedor,
  listCategorias,
  createCategoria,
  listUnidadesMedida,
  createUnidadMedida,
} from '../services/producto.service';
import { sendSuccess } from '../utils/response';

export async function listProductosHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categoriaId = req.query.categoriaId as string;
    const search = req.query.search as string;
    const bajoMinimo = req.query.bajoMinimo === 'true';
    const productos = await listProductos(req.tenant!.id, { categoriaId, search, bajoMinimo });
    sendSuccess(res, productos, 200);
  } catch (error) {
    next(error);
  }
}

export async function getProductoHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const producto = await getProductoById(req.tenant!.id, id);
    sendSuccess(res, producto, 200);
  } catch (error) {
    next(error);
  }
}

export async function createProductoHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const producto = await createProducto(req.tenant!.id, req.user!.id, req.body);
    sendSuccess(res, producto, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateProductoHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const producto = await updateProducto(req.tenant!.id, id, req.user!.id, req.body);
    sendSuccess(res, producto, 200);
  } catch (error) {
    next(error);
  }
}

export async function linkProveedorHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const vinculo = await linkProductoProveedor(req.tenant!.id, id, req.user!.id, req.body);
    sendSuccess(res, vinculo, 200);
  } catch (error) {
    next(error);
  }
}

export async function listCategoriasHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categorias = await listCategorias(req.tenant!.id);
    sendSuccess(res, categorias, 200);
  } catch (error) {
    next(error);
  }
}

export async function createCategoriaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categoria = await createCategoria(req.tenant!.id, req.body);
    sendSuccess(res, categoria, 201);
  } catch (error) {
    next(error);
  }
}

export async function listUnidadesMedidaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uoms = await listUnidadesMedida(req.tenant!.id);
    sendSuccess(res, uoms, 200);
  } catch (error) {
    next(error);
  }
}

export async function createUnidadMedidaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uom = await createUnidadMedida(req.tenant!.id, req.body);
    sendSuccess(res, uom, 201);
  } catch (error) {
    next(error);
  }
}
