import { prisma } from '../config/database';
import { NotFoundError, BadRequestError } from '../errors/app-error';
import { ragService, RagSourceCitation } from './rag.service';
import { deepSeekDriveProveedoresService } from './deepseek-drive-proveedores.service';

export const CATEGORIAS_MENU = {
  1: 'Consultar informacion documental (productos, proveedores, inventario, ordenes en Drive)',
  2: 'Analizar empresa (reportes ejecutivos, compras, evaluaciones e indicadores)',
  3: 'Detectar riesgos (matriz de alertas operativas y politicas de contingencia)',
  4: 'Ayuda y procedimientos (manuales de usuario, politicas y reglas de negocio)',
};

const BIENVENIDA_CATEGORIA: Record<number, string> = {
  1: 'Bienvenido al modulo de Consulta de Informacion. El asistente consulta exclusivamente los documentos empresariales, catalogos e informes archivados en Google Drive para responder sus consultas. Indique que informacion documental desea consultar.',
  2: 'Bienvenido al modulo de Analisis Empresarial. Analizare los reportes ejecutivos, indicadores de compras y evaluaciones de proveedores documentados en el repositorio de Google Drive.',
  3: 'Bienvenido al modulo de Deteccion de Riesgos y Alertas. Recuperare la matriz documental de alertas operativas, quiebres de inventario proyectados y protocolos de contingencia de Google Drive.',
  4: 'Bienvenido a Ayuda y Procedimientos. Consultare los manuales del sistema, politicas corporativas y procedimientos operativos estandar (SOP) registrados en Google Drive para orientarle paso a paso.',
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

/**
 * Procesa la pregunta del usuario consultando EXCLUSIVAMENTE el conocimiento documental de Google Drive via RAG
 */
export async function sendMensajeChatbot(
  empresaId: string,
  userId: string,
  conversacionId: string,
  contenido: string
) {
  if (!contenido || !contenido.trim()) {
    throw new BadRequestError('El contenido del mensaje no puede estar vacio');
  }

  // 1. Validar conversacion y aislamiento por empresa en MySQL (contexto y RBAC)
  const conversacion = await prisma.conversacionChatbot.findFirst({
    where: { id: conversacionId, empresa_id: empresaId },
  });

  if (!conversacion) {
    throw new NotFoundError('Conversacion no encontrada para la empresa activa');
  }

  // 2. Guardar mensaje del usuario en MySQL
  await prisma.mensajeChatbot.create({
    data: {
      conversacion_id: conversacionId,
      remitente: 'USUARIO',
      contenido: contenido.trim(),
    },
  });

  // 3. IDENTIFICAR DOMINIO DE PROVEEDORES: CONSULTA DIRECTA AL TXT DE GOOGLE DRIVE CON DEEPSEEK
  // (Flujo exclusivo sin intervención de Qdrant, sin embeddings y sin consultas directas a tablas MySQL)
  if (deepSeekDriveProveedoresService.isSupplierQuery(contenido.trim())) {
    const supplierResult = await deepSeekDriveProveedoresService.processSupplierQuery(
      empresaId,
      contenido.trim()
    );

    const respuestaFinal = supplierResult.respuesta;
    const tokensUsados = supplierResult.tokensUsed;

    const asistenteMsg = await prisma.mensajeChatbot.create({
      data: {
        conversacion_id: conversacionId,
        remitente: 'ASISTENTE',
        contenido: respuestaFinal,
        tokens_usados: tokensUsados,
      },
    });

    await prisma.conversacionChatbot.update({
      where: { id: conversacionId },
      data: { updatedAt: new Date() },
    });

    await prisma.consultaChatbotLog.create({
      data: {
        empresa_id: empresaId,
        usuario_id: userId,
        pregunta: contenido.trim(),
        respuesta_resumen: respuestaFinal.slice(0, 500),
        tokens_usados: asistenteMsg.tokens_usados,
        fue_exitosa: supplierResult.estado !== 'ERROR',
      },
    });

    return {
      mensaje: asistenteMsg,
      tokensUsed: asistenteMsg.tokens_usados,
      ragResult: {
        respuesta: respuestaFinal,
        fuentes: [
          {
            nombreDocumento: 'informe_proveedores.txt',
            numeroFragmento: 1,
            relevanciaScore: 1.0,
            urlDocumento: `https://drive.google.com/file/d/${supplierResult.documentoId}/view`,
            fechaActualizacion: supplierResult.fechaModificacionDrive,
          },
        ],
        estado: supplierResult.estado,
      },
    };
  }

  // 4. Si no es de proveedores, consultar el conocimiento documental general mediante RAG
  // (Sin desvio a consultas directas de tablas operativas MySQL)
  const ragResult = await ragService.queryRag(
    empresaId,
    userId,
    contenido.trim(),
    conversacionId
  );

  let respuestaFinal = ragResult.respuesta;
  let tokensUsados = 120;

  // Si hay fuentes documentales recuperadas, adjuntar citas formales verificables
  if (ragResult.fuentes && ragResult.fuentes.length > 0) {
    const fuentesTexto = ragResult.fuentes
      .map((f: RagSourceCitation) => {
        const link = f.urlDocumento ? ` [Abrir en Google Drive](${f.urlDocumento})` : '';
        return `* **Documento:** ${f.nombreDocumento} (Fragmento #${f.numeroFragmento}, Relevancia: ${(f.relevanciaScore * 100).toFixed(0)}%)${link}\n  *Actualizado: ${new Date(f.fechaActualizacion || Date.now()).toLocaleString('es-CR')}*`;
      })
      .join('\n\n');

    respuestaFinal += `\n\n---\n**Fuentes Documentales de Google Drive:**\n\n${fuentesTexto}`;
    tokensUsados = ragResult.fuentes.reduce((sum: number) => sum + 150, 200);
  }

  // 4. Guardar respuesta del asistente en MySQL
  const asistenteMsg = await prisma.mensajeChatbot.create({
    data: {
      conversacion_id: conversacionId,
      remitente: 'ASISTENTE',
      contenido: respuestaFinal,
      tokens_usados: tokensUsados,
    },
  });

  // 5. Actualizar timestamp de conversacion
  await prisma.conversacionChatbot.update({
    where: { id: conversacionId },
    data: { updatedAt: new Date() },
  });

  // 6. Registro de auditoria historica en MySQL
  await prisma.consultaChatbotLog.create({
    data: {
      empresa_id: empresaId,
      usuario_id: userId,
      pregunta: contenido.trim(),
      respuesta_resumen: respuestaFinal.slice(0, 500),
      tokens_usados: asistenteMsg.tokens_usados,
      fue_exitosa: ragResult.estado !== 'ERROR',
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
    motor: 'NexoSupply Documental Intelligence Engine (Google Drive RAG + Qdrant)',
    proveedor: 'NexoSupply Core Documental',
    activo: true,
    aislamientoMultiTenant: true,
    categoriasDisponibles: CATEGORIAS_MENU,
    fuenteExclusiva: 'Google Drive Documental Repository (NexoSupply-Root)',
  };
}
