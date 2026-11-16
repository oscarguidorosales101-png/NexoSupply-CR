import { Router } from 'express';
import { chatbotQueryHandler, chatbotStatusHandler } from '../controllers/chatbot.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticate, requireTenant);

// Consulta al asistente (preparado pero desactivado de forma segura sin API key en Etapa 3)
router.post('/query', chatbotQueryHandler);
router.get('/status', chatbotStatusHandler);

export default router;
