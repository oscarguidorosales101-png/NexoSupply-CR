import { Router } from 'express';
import {
  listProductosHandler,
  getProductoHandler,
  createProductoHandler,
  updateProductoHandler,
  linkProveedorHandler,
  listCategoriasHandler,
  createCategoriaHandler,
  listUnidadesMedidaHandler,
  createUnidadMedidaHandler,
} from '../controllers/producto.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createProductoSchema,
  updateProductoSchema,
  linkProductoProveedorSchema,
  createCategoriaSchema,
  createUnidadMedidaSchema,
} from '../validators/producto.validator';
import { PERMISOS } from '../constants/roles';

const router = Router();

router.use(authenticate, requireTenant);

// Categorías
router.get('/categorias', listCategoriasHandler);
router.post(
  '/categorias',
  requirePermission(PERMISOS.PRODUCTOS_GESTIONAR),
  validateBody(createCategoriaSchema),
  createCategoriaHandler
);

// Unidades de medida
router.get('/unidades-medida', listUnidadesMedidaHandler);
router.post(
  '/unidades-medida',
  requirePermission(PERMISOS.PRODUCTOS_GESTIONAR),
  validateBody(createUnidadMedidaSchema),
  createUnidadMedidaHandler
);

// Productos
router.get('/', listProductosHandler);
router.get('/:id', getProductoHandler);

router.post(
  '/',
  requirePermission(PERMISOS.PRODUCTOS_GESTIONAR),
  validateBody(createProductoSchema),
  createProductoHandler
);

router.patch(
  '/:id',
  requirePermission(PERMISOS.PRODUCTOS_GESTIONAR),
  validateBody(updateProductoSchema),
  updateProductoHandler
);

// Vínculo Producto-Proveedor N:M
router.post(
  '/:id/proveedores',
  requirePermission(PERMISOS.PRODUCTOS_GESTIONAR),
  validateBody(linkProductoProveedorSchema),
  linkProveedorHandler
);

export default router;
