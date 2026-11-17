import { prisma } from '../config/database';
import { NotFoundError, BadRequestError } from '../errors/app-error';
import { ragService, RagSourceCitation } from './rag.service';

export const CATEGORIAS_MENU = {
  1: 'Consultar informacion (productos, proveedores, inventario, ordenes)',
  2: 'Analizar mi empresa (indicadores, compras, evaluaciones, tendencias)',
  3: 'Detectar problemas y riesgos (alertas criticas, stock bajo, retrasos)',
  4: 'Ayuda y orientacion (uso de la plataforma, como registrar datos)',
};

const BIENVENIDA_CATEGORIA: Record<number, string> = {
  1: 'Bienvenido al modulo de Consulta de Informacion Documental. Las respuestas se recuperan directamente desde los reportes y documentos indexados en Google Drive (inventario_actual.pdf, catalogo_productos.pdf, ordenes_pendientes.pdf). Indique que dato desea consultar.',
  2: 'Bienvenido al modulo de Analisis Empresarial. Consultare los indicadores y resumenes ejecutivos oficiales de Google Drive (resumen_ejecutivo.pdf, evaluacion_proveedores.pdf) para responder sobre volumen de compras y metricas de operacion.',
  3: 'Bienvenido al modulo de Deteccion de Riesgos. Recuperare la matriz documental de alertas criticas y retrasos logísticos (alertas_criticas.pdf) para informarle sobre quiebres de inventario o proveedores fuera de plazo.',
  4: 'Bienvenido a Ayuda y Orientacion. Consultare las politicas, manuales y directrices de operacion registradas en Google Drive para guiarle paso a paso en el uso de los modulos de NexoSupply CR.',
};

export async function createConversacion(
  empresaId: string,
  userId: string,
  categoriaOpcion: number = 1,
  tituloPersonalizado?: string
) {
  const opcion = Math.min(Math.max(categoriaOpcion, 1), 4);
  const titulo = tituloPersonalizado || `Consulta: ${CATEGORIAS_MENU[opcion as keyof typeof CATEGORIAS_MENU].split(' (')[0]}`;

  return await prisma.$transaction(async (tx) => {
    const conversacion = await tx.conversacionChatbot.create({
      data: {
        empresa_id: empresaId,
        usuario_id: userId,
        categoria_opcion: opcion,
        titulo,
        estado: 'ACTIVA',
      },
    });

    const bienvenida = BIENVENIDA_CATEGORIA[opcion] || BIENVENIDA_CATEGORIA[1];

    await tx.mensajeChatbot.create({
      data: {
        conversacion_id: conversacion.id,
        remitente: 'ASISTENTE',
        contenido: bienvenida,
      },
    });

    return await tx.conversacionChatbot.findUnique({
      where: { id: conversacion.id },
      include: {
        mensajes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  });
}

export async function listConversaciones(empresaId: string, userId: string) {
  return await prisma.conversacionChatbot.findMany({
    where: {
      empresa_id: empresaId,
      usuario_id: userId,
    },
    orderBy: { updatedAt: 'desc' },
    take: 30,
  });
}

export async function getConversacion(empresaId: string, conversacionId: string) {
  const conversacion = await prisma.conversacionChatbot.findFirst({
    where: { id: conversacionId, empresa_id: empresaId },
    include: {
      mensajes: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversacion) {
    throw new NotFoundError('Conversacion no encontrada');
  }

  return conversacion;
}

export async function sendMensajeChatbot(
  empresaId: string,
  userId: string,
  conversacionId: string,
  contenido: string
) {
  if (!contenido || !contenido.trim()) {
    throw new BadRequestError('El contenido del mensaje no puede estar vacio');
  }

  // 1. Validar conversacion y pertenencia a empresa
  const conversacion = await prisma.conversacionChatbot.findFirst({
    where: { id: conversacionId, empresa_id: empresaId },
  });

  if (!conversacion) {
    throw new NotFoundError('Conversacion no encontrada para la empresa activa');
  }

  // 2. Guardar mensaje del usuario
  await prisma.mensajeChatbot.create({
    data: {
      conversacion_id: conversacionId,
      remitente: 'USUARIO',
      contenido: contenido.trim(),
    },
  });

  // 3. RECUPERACION DOCUMENTAL RAG DESDE GOOGLE DRIVE
  // Consulta exclusivamente el indice vectorial y documental de Google Drive de la empresa
  const ragResult = await ragService.queryRag(
    empresaId,
    userId,
    contenido.trim(),
    conversacionId
  );

  // 4. Formatear respuesta con citas y fuentes verificables
  let respuestaFinal = ragResult.respuesta;

  if (ragResult.fuentes.length > 0) {
    const fuentesTexto = ragResult.fuentes
      .map((f: RagSourceCitation) => {
        const link = f.urlDocumento ? ` [Ver en Drive](${f.urlDocumento})` : '';
        return `* **Documento:** ${f.nombreDocumento} (Fragmento #${f.numeroFragmento}, Relevancia: ${(f.relevanciaScore * 100).toFixed(0)}%)${link}\n  *Actualizado: ${new Date(f.fechaActualizacion || Date.now()).toLocaleString('es-CR')}*`;
      })
      .join('\n\n');

    respuestaFinal += `\n\n---\n**Fuentes Documentales de Google Drive:**\n\n${fuentesTexto}`;
  }

  // 5. Guardar respuesta del asistente en MySQL
  const asistenteMsg = await prisma.mensajeChatbot.create({
    data: {
      conversacion_id: conversacionId,
      remitente: 'ASISTENTE',
      contenido: respuestaFinal,
      tokens_usados: ragResult.fuentes.reduce((sum, f) => sum + 150, 200),
    },
  });

  // 6. Actualizar timestamp de conversacion
  await prisma.conversacionChatbot.update({
    where: { id: conversacionId },
    data: { updatedAt: new Date() },
  });

  // 7. Registro de auditoria historica
  await prisma.consultaChatbotLog.create({
    data: {
      empresa_id: empresaId,
      usuario_id: userId,
      pregunta: contenido.trim(),
      respuesta_resumen: respuestaFinal.slice(0, 500),
      tokens_usados: asistenteMsg.tokens_usados,
      fue_exitosa: ragResult.estado === 'EXITOSO',
    },
  });

  return {
    mensaje: asistenteMsg,
    tokensUsed: asistenteMsg.tokens_usados,
    ragResult,
  };
}

export async function getChatbotStatus() {
  return {
    disponible: true,
    motor: 'Motor Documental RAG (Google Drive)',
    proveedor: 'NexoSupply RAG Core',
    activo: true,
    aislamientoMultiTenant: true,
    categoriasDisponibles: CATEGORIAS_MENU,
  };
}
