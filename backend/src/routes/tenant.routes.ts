import { Router } from 'express';
import {
  getProfileHandler,
  updateProfileHandler,
  updateConfigHandler,
  listMembersHandler,
  inviteMemberHandler,
  listRolesPermissionsHandler,
} from '../controllers/tenant.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  updateEmpresaSchema,
  updateConfiguracionSchema,
  inviteMemberSchema,
} from '../validators/tenant.validator';
import { PERMISOS } from '../constants/roles';

const router = Router();

// Todas las rutas requieren usuario autenticado y contexto de empresa válido
router.use(authenticate, requireTenant);

router.get('/profile', getProfileHandler);
router.patch(
  '/profile',
  requirePermission(PERMISOS.EMPRESAS_CONFIGURAR),
  validateBody(updateEmpresaSchema),
  updateProfileHandler
);

router.patch(
  '/configuracion',
  requirePermission(PERMISOS.EMPRESAS_CONFIGURAR),
  validateBody(updateConfiguracionSchema),
  updateConfigHandler
);

router.get('/members', listMembersHandler);
router.post(
  '/members/invite',
  requirePermission(PERMISOS.USUARIOS_GESTIONAR),
  validateBody(inviteMemberSchema),
  inviteMemberHandler
);

router.get('/roles-permisos', listRolesPermissionsHandler);

export default router;
