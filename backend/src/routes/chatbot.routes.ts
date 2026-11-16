import { Router } from 'express';
import {
  createConversacionHandler,
  listConversacionesHandler,
  getConversacionHandler,
  sendMensajeHandler,
  chatbotStatusHandler,
} from '../controllers/chatbot.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireTenant } from '../middlewares/tenant.middleware';

const router = Router();

router.use(authenticate, requireTenant);

router.get('/status', chatbotStatusHandler);
router.post('/conversaciones', createConversacionHandler);
router.get('/conversaciones', listConversacionesHandler);
router.get('/conversaciones/:id', getConversacionHandler);
router.post('/conversaciones/:id/mensajes', sendMensajeHandler);

export default router;
