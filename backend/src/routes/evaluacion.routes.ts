import { Router } from 'express';
import {
  runEvaluacionHandler,
  listEvaluacionesHandler,
  createIncidenciaHandler,
  resolveIncidenciaHandler,
  listIncidenciasHandler,
} from '../controllers/evaluacion.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  runEvaluacionSchema,
  createIncidenciaSchema,
  resolverIncidenciaSchema,
} from '../validators/evaluacion.validator';
import { PERMISOS } from '../constants/roles';

const router = Router();

router.use(authenticate, requireTenant);

// Evaluaciones
router.get('/', listEvaluacionesHandler);
router.post(
  '/calcular',
  requirePermission(PERMISOS.REPORTES_GERENCIALES),
  validateBody(runEvaluacionSchema),
  runEvaluacionHandler
);

// Incidencias
router.get('/incidencias', listIncidenciasHandler);
router.post(
  '/incidencias',
  requirePermission(PERMISOS.PROVEEDORES_CREAR_EDITAR),
  validateBody(createIncidenciaSchema),
  createIncidenciaHandler
);
router.patch(
  '/incidencias/:id/resolver',
  requirePermission(PERMISOS.PROVEEDORES_CREAR_EDITAR),
  validateBody(resolverIncidenciaSchema),
  resolveIncidenciaHandler
);

export default router;
