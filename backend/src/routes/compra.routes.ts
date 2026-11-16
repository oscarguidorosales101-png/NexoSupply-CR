import { Router } from 'express';
import {
  listSolicitudesHandler,
  getSolicitudHandler,
  createSolicitudHandler,
  decideAprobacionHandler,
} from '../controllers/solicitud.controller';
import {
  listOrdenesHandler,
  getOrdenHandler,
  createOrdenFromSolicitudHandler,
  createOrdenDirectaHandler,
} from '../controllers/orden.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createSolicitudSchema,
  decideAprobacionSchema,
  createOrdenDirectaSchema,
} from '../validators/compra.validator';
import { PERMISOS } from '../constants/roles';

const router = Router();

router.use(authenticate, requireTenant);

// Solicitudes de compra
router.get('/solicitudes', listSolicitudesHandler);
router.get('/solicitudes/:id', getSolicitudHandler);
router.post(
  '/solicitudes',
  requirePermission(PERMISOS.SOLICITUDES_CREAR),
  validateBody(createSolicitudSchema),
  createSolicitudHandler
);
router.post(
  '/solicitudes/:id/aprobar',
  requirePermission(PERMISOS.SOLICITUDES_APROBAR),
  validateBody(decideAprobacionSchema),
  decideAprobacionHandler
);

// Órdenes de compra
router.get('/ordenes', listOrdenesHandler);
router.get('/ordenes/:id', getOrdenHandler);

router.post(
  '/solicitudes/:solicitudId/generar-orden',
  requirePermission(PERMISOS.ORDENES_EMITIR),
  createOrdenFromSolicitudHandler
);

router.post(
  '/ordenes',
  requirePermission(PERMISOS.ORDENES_EMITIR),
  validateBody(createOrdenDirectaSchema),
  createOrdenDirectaHandler
);

export default router;
