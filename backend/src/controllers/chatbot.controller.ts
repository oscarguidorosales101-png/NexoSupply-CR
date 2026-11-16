import { Request, Response, NextFunction } from 'express';
import { processChatbotQuery, getChatbotStatus } from '../services/chatbot.service';
import { sendSuccess } from '../utils/response';

export async function chatbotQueryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pregunta } = req.body;
    const result = await processChatbotQuery(req.tenant!.id, req.user!.id, pregunta || '');
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function chatbotStatusHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await getChatbotStatus();
    sendSuccess(res, status, 200);
  } catch (error) {
    next(error);
  }
}
