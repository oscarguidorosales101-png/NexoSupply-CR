import { Request, Response, NextFunction } from 'express';
import {
  createConversacion,
  listConversaciones,
  getConversacion,
  sendMensajeChatbot,
  getChatbotStatus,
} from '../services/chatbot.service';
import { sendSuccess } from '../utils/response';

export async function createConversacionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { categoriaOpcion, titulo } = req.body;
    const result = await createConversacion(
      req.tenant!.id,
      req.user!.id,
      categoriaOpcion ? Number(categoriaOpcion) : 1,
      titulo
    );
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function listConversacionesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await listConversaciones(req.tenant!.id, req.user!.id);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function getConversacionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const result = await getConversacion(req.tenant!.id, id);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function sendMensajeHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { contenido } = req.body;
    const result = await sendMensajeChatbot(
      req.tenant!.id,
      req.user!.id,
      id,
      contenido || ''
    );
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function chatbotStatusHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = await getChatbotStatus();
    sendSuccess(res, status, 200);
  } catch (error) {
    next(error);
  }
}
