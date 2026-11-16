import { Router } from 'express';
import {
  getStockHandler,
  getKardexHandler,
  adjustStockHandler,
  listAlmacenesHandler,
  createAlmacenHandler,
} from '../controllers/inventario.controller';
import {
  registrarRecepcionHandler,
  listRecepcionesHandler,
} from '../controllers/recepcion.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createRecepcionSchema,
  createAjusteInventarioSchema,
  createAlmacenSchema,
} from '../validators/inventario.validator';
import { PERMISOS } from '../constants/roles';

const router = Router();

router.use(authenticate, requireTenant);

// Almacenes
router.get('/almacenes', listAlmacenesHandler);
router.post(
  '/almacenes',
  requirePermission(PERMISOS.INVENTARIO_AJUSTAR),
  validateBody(createAlmacenSchema),
  createAlmacenHandler
);

// Existencias y Kardex
router.get('/stock', getStockHandler);
router.get('/kardex', getKardexHandler);

// Ajuste manual de inventario (Kardex ACID)
router.post(
  '/ajustes',
  requirePermission(PERMISOS.INVENTARIO_AJUSTAR),
  validateBody(createAjusteInventarioSchema),
  adjustStockHandler
);

// Recepciones Físicas de Compra
router.get('/recepciones', listRecepcionesHandler);
router.post(
  '/recepciones',
  requirePermission(PERMISOS.RECEPCIONES_REGISTRAR),
  validateBody(createRecepcionSchema),
  registrarRecepcionHandler
);

export default router;
