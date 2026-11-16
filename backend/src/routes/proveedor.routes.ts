import { Router } from 'express';
import {
  listProveedoresHandler,
  getProveedorHandler,
  createProveedorHandler,
  updateProveedorHandler,
  addContactoHandler,
} from '../controllers/proveedor.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createProveedorSchema,
  updateProveedorSchema,
  createContactoSchema,
} from '../validators/proveedor.validator';
import { PERMISOS } from '../constants/roles';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', listProveedoresHandler);
router.get('/:id', getProveedorHandler);

router.post(
  '/',
  requirePermission(PERMISOS.PROVEEDORES_CREAR_EDITAR),
  validateBody(createProveedorSchema),
  createProveedorHandler
);

router.patch(
  '/:id',
  requirePermission(PERMISOS.PROVEEDORES_CREAR_EDITAR),
  validateBody(updateProveedorSchema),
  updateProveedorHandler
);

router.post(
  '/:id/contactos',
  requirePermission(PERMISOS.PROVEEDORES_CREAR_EDITAR),
  validateBody(createContactoSchema),
  addContactoHandler
);

export default router;
