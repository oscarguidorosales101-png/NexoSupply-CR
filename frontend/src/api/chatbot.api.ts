import { apiClient } from './client';

export interface MensajeChatbot {
  id: string;
  conversacion_id: string;
  remitente: 'USUARIO' | 'ASISTENTE' | 'SISTEMA';
  contenido: string;
  tokens_usados?: number;
  metadatos?: any;
  createdAt: string;
}

export interface ConversacionChatbot {
  id: string;
  empresa_id: string;
  usuario_id: string;
  titulo: string;
  categoria_opcion: number;
  estado: string;
  createdAt: string;
  updatedAt: string;
  mensajes?: MensajeChatbot[];
}

export interface ChatbotStatus {
  disponible: boolean;
  motor: string;
  proveedor: string;
  activo: boolean;
  aislamientoMultiTenant: boolean;
  categoriasDisponibles: Record<number, string>;
}

export interface SendMensajeResponse {
  mensaje: MensajeChatbot;
  tokensUsed: number;
}

export async function getChatbotStatus(): Promise<ChatbotStatus> {
  return await apiClient<ChatbotStatus>('/chatbot/status');
}

export async function createConversacion(
  categoriaOpcion: number,
  titulo?: string
): Promise<ConversacionChatbot> {
  return await apiClient<ConversacionChatbot>('/chatbot/conversaciones', {
    method: 'POST',
    body: JSON.stringify({ categoriaOpcion, titulo }),
  });
}

export async function listConversaciones(): Promise<ConversacionChatbot[]> {
  return await apiClient<ConversacionChatbot[]>('/chatbot/conversaciones');
}

export async function getConversacion(id: string): Promise<ConversacionChatbot> {
  return await apiClient<ConversacionChatbot>(`/chatbot/conversaciones/${id}`);
}

export async function sendMensajeChatbot(
  conversacionId: string,
  contenido: string
): Promise<SendMensajeResponse> {
  return await apiClient<SendMensajeResponse>(`/chatbot/conversaciones/${conversacionId}/mensajes`, {
    method: 'POST',
    body: JSON.stringify({ contenido }),
  });
}
