import { Router } from 'express';
import {
  getEstadoConocimientoHandler,
  listCarpetasHandler,
  listDocumentosHandler,
  ejecutarSincronizacionManualHandler,
  reintentarDocumentoHandler,
  listHistorialSincronizacionesHandler,
  getOAuthStatusHandler,
  getOAuthAuthUrlHandler,
  revokeOAuthAccessHandler,
  uploadTestOAuthFileHandler,
  syncOperationalFilesOAuthHandler,
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

// Endpoints OAuth 2.0 (Google Drive Personal)
router.get('/oauth/status', getOAuthStatusHandler);
router.get('/oauth/auth-url', getOAuthAuthUrlHandler);
router.post(
  '/oauth/revoke',
  requirePermission(PERMISOS.EMPRESAS_CONFIGURAR),
  revokeOAuthAccessHandler
);
router.post(
  '/oauth/upload-test',
  requirePermission(PERMISOS.EMPRESAS_CONFIGURAR),
  uploadTestOAuthFileHandler
);
router.post(
  '/oauth/sync-operational-files',
  requirePermission(PERMISOS.EMPRESAS_CONFIGURAR),
  syncOperationalFilesOAuthHandler
);

export default router;
