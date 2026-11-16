import { Router } from 'express';
import { getDashboardKPIsHandler, listAuditoriasHandler } from '../controllers/reporte.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { PERMISOS } from '../constants/roles';

const router = Router();

router.use(authenticate, requireTenant);

router.get(
  '/dashboard',
  requirePermission(PERMISOS.REPORTES_GERENCIALES),
  getDashboardKPIsHandler
);

router.get(
  '/auditoria',
  requirePermission(PERMISOS.EMPRESAS_CONFIGURAR),
  listAuditoriasHandler
);

export default router;
