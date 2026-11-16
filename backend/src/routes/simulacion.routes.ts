import { Router } from 'express';
import { runSimulacionHandler, listSimulacionesHandler } from '../controllers/simulacion.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { runSimulacionSchema } from '../validators/simulacion.validator';
import { PERMISOS } from '../constants/roles';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/', listSimulacionesHandler);
router.post(
  '/',
  requirePermission(PERMISOS.SIMULACIONES_EJECUTAR),
  validateBody(runSimulacionSchema),
  runSimulacionHandler
);

export default router;
