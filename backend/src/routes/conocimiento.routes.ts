import { Router } from 'express';
import {
  getEstadoConocimientoHandler,
  listCarpetasHandler,
  listDocumentosHandler,
  ejecutarSincronizacionManualHandler,
  reintentarDocumentoHandler,
  listHistorialSincronizacionesHandler,
} from '../controllers/conocimiento.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { PERMISOS } from '../constants/roles';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/estado', getEstadoConocimientoHandler);
router.get('/carpetas', listCarpetasHandler);
router.get('/documentos', listDocumentosHandler);
router.post(
  '/sincronizar',
  requirePermission(PERMISOS.EMPRESAS_CONFIGURAR),
  ejecutarSincronizacionManualHandler
);
router.post(
  '/documentos/:id/reintentar',
  requirePermission(PERMISOS.EMPRESAS_CONFIGURAR),
  reintentarDocumentoHandler
);
router.get('/sincronizaciones', listHistorialSincronizacionesHandler);

export default router;
