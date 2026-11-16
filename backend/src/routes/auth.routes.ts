import { Router } from 'express';
import {
  loginHandler,
  registerHandler,
  logoutHandler,
  meHandler,
  switchTenantHandler,
  changePasswordHandler,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  loginSchema,
  registerSchema,
  switchTenantSchema,
  changePasswordSchema,
} from '../validators/auth.validator';
import { authRateLimiter } from '../config/security';

const router = Router();

router.post('/login', authRateLimiter, validateBody(loginSchema), loginHandler);
router.post('/register', authRateLimiter, validateBody(registerSchema), registerHandler);
router.post('/logout', authenticate, logoutHandler);
router.get('/me', authenticate, meHandler);
router.post('/switch-tenant', authenticate, validateBody(switchTenantSchema), switchTenantHandler);
router.post('/change-password', authenticate, validateBody(changePasswordSchema), changePasswordHandler);

export default router;
