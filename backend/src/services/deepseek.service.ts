import { env } from '../config/env';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callDeepSeekChat(
  messages: ChatMessage[],
  systemContext: string
): Promise<{ reply: string; tokensUsed: number }> {
  const apiKey = env.DEEPSEEK_API_KEY || env.AI_API_KEY;

  if (!apiKey) {
    return {
      reply:
        'El motor de IA DeepSeek no tiene una clave API configurada en el servidor. Por favor, asegúrese de configurar DEEPSEEK_API_KEY en backend/.env.',
      tokensUsed: 0,
    };
  }

  const completeMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `Eres NexoBot, el Asistente Inteligente de Abastecimiento, Compras, Proveedores e Inventario de NexoSupply CR.
Tu propósito exclusivo es ayudar al usuario de la empresa activa a consultar información autorizada, analizar indicadores, interpretar riesgos y orientar sobre el uso de la plataforma.

REGLAS ESTRICTAS DE SEGURIDAD Y COMPORTAMIENTO:
1. Responde siempre en español profesional, conciso y cordial.
2. No inventes información. Si un dato no está en el contexto o en el sistema, indícalo claramente.
3. No puedes ejecutar operaciones de modificación o aprobación (no apruebas órdenes ni alteras inventario).
4. No tienes acceso a contraseñas, hashes, claves privadas ni datos de otras empresas.
5. Usa formato Markdown con viñetas y negrita para facilitar la lectura en el widget web.

CONTEXTO OPERATIVO EN VIVO DE LA EMPRESA ACTIVA:
${systemContext}`,
    },
    ...messages,
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: completeMessages,
        temperature: 0.3,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.warn(`[DeepSeek API Error] HTTP ${response.status}: ${errBody}`);
      return {
        reply: `El servicio de IA respondió con un código de estado ${response.status}. Por favor intente nuevamente en unos instantes.`,
        tokensUsed: 0,
      };
    }

    const data = (await response.json()) as any;
    const replyText = data.choices?.[0]?.message?.content || 'No se obtuvo respuesta del modelo de IA.';
    const tokens = data.usage?.total_tokens || 0;

    return {
      reply: replyText,
      tokensUsed: tokens,
    };
  } catch (error: any) {
    console.error('[DeepSeek Connection Error]:', error?.message);
    return {
      reply:
        'No fue posible establecer conexión con el proveedor DeepSeek en este momento. Verifique la conexión a internet del servidor o consulte los registros.',
      tokensUsed: 0,
    };
  }
}
