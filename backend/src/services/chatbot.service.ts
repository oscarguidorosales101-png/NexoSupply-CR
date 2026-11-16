import { prisma } from '../config/database';

export async function processChatbotQuery(empresaId: string, userId: string, pregunta: string) {
  // Servicio desactivado de forma segura conforme a la especificación de la Etapa 3.
  // No realiza llamadas a APIs externas de IA ni consultas RAG.
  // Registra la consulta para fines de auditoría previa sin invocar proveedores de IA.
  const registro = await prisma.consultaChatbotLog.create({
    data: {
      empresa_id: empresaId,
      usuario_id: userId,
      pregunta: pregunta.trim(),
      respuesta_resumen:
        'El servicio de consulta asistida por IA se encuentra en modo de preparación. La activación formal se realizará una vez que el propietario autorice y configure la clave de IA correspondiente.',
      tokens_usados: 0,
      fue_exitosa: false,
    },
  });

  return {
    activo: false,
    codigoEstado: 'AI_CHATBOT_DISABLED_STAGING',
    mensaje:
      'El módulo de consulta asistida por IA está preparado arquitectónicamente pero permanece desactivado de forma segura hasta la Etapa 5.',
    consultaId: registro.id,
  };
}

export async function getChatbotStatus() {
  return {
    disponible: false,
    etapaProgramada: 'Etapa 5 (Integración de Chatbot en Cliente Web)',
    requiereApiKey: true,
    aislamientoMultiTenant: true,
  };
}
