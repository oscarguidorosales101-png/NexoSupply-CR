import { Router } from 'express';
import {
  listAlertasHandler,
  resolveAlertaHandler,
  updateEstadoAlertaHandler,
  runRiskScanHandler,
} from '../controllers/riesgo.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { PERMISOS } from '../constants/roles';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/alertas', listAlertasHandler);
router.patch('/alertas/:id/resolver', resolveAlertaHandler);
router.patch('/alertas/:id/estado', updateEstadoAlertaHandler);
router.post(
  '/escanear',
  requirePermission(PERMISOS.REPORTES_GERENCIALES),
  runRiskScanHandler
);

export default router;
