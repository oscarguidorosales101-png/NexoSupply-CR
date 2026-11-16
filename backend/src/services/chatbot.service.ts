import { prisma } from '../config/database';
import { NotFoundError, BadRequestError } from '../errors/app-error';
import { callDeepSeekChat, ChatMessage } from './deepseek.service';

export const CATEGORIAS_MENU = {
  1: 'Consultar información (productos, proveedores, inventario, órdenes)',
  2: 'Analizar mi empresa (indicadores, compras, evaluaciones, tendencias)',
  3: 'Detectar problemas y riesgos (alertas críticas, stock bajo, retrasos)',
  4: 'Ayuda y orientación (uso de la plataforma, cómo registrar datos)',
};

const BIENVENIDA_CATEGORIA: Record<number, string> = {
  1: '¡Hola! Estoy listo para ayudarte a **Consultar información**. Puedes preguntarme por el stock disponible de un SKU, datos de contacto de proveedores, o el estado de tus órdenes y solicitudes de compra.',
  2: '¡Hola! En la categoría **Analizar mi empresa**, puedo explicarte tus KPIs ejecutivos, valor total de inventario, índice de cumplimiento de proveedores (OTD/OFR) y compras por mes.',
  3: '¡Hola! En **Detectar problemas y riesgos**, te informaré sobre alertas críticas no resueltas, productos con existencias por debajo del stock mínimo o con quiebre inminente, y proveedores con retraso.',
  4: '¡Hola! En **Ayuda y orientación**, te guiaré paso a paso sobre cómo registrar proveedores, emitir órdenes de compra, procesar recepciones físicas en bodega o configurar parámetros de tu empresa.',
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
    include: {
      mensajes: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getConversacion(empresaId: string, conversacionId: string) {
  const conversacion = await prisma.conversacionChatbot.findFirst({
    where: {
      id: conversacionId,
      empresa_id: empresaId,
    },
    include: {
      mensajes: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversacion) {
    throw new NotFoundError('Conversación no encontrada');
  }

  return conversacion;
}

export async function sendMensajeChatbot(
  empresaId: string,
  userId: string,
  conversacionId: string,
  contenido: string
) {
  const conversacion = await prisma.conversacionChatbot.findFirst({
    where: { id: conversacionId, empresa_id: empresaId },
    include: {
      mensajes: {
        orderBy: { createdAt: 'asc' },
        take: 10,
      },
    },
  });

  if (!conversacion) {
    throw new NotFoundError('Conversación no encontrada');
  }

  // 1. Guardar mensaje del usuario
  await prisma.mensajeChatbot.create({
    data: {
      conversacion_id: conversacionId,
      remitente: 'USUARIO',
      contenido: contenido.trim(),
    },
  });

  // 2. Construir contexto dinámico de la empresa activa
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { razon_social: true, moneda_base: true },
  });

  const totalProductos = await prisma.producto.count({
    where: { empresa_id: empresaId, activo: true },
  });

  const totalProveedores = await prisma.proveedor.count({
    where: { empresa_id: empresaId, activo: true },
  });

  const ordenesPendientes = await prisma.ordenCompra.findMany({
    where: {
      empresa_id: empresaId,
      estado: { in: ['EMITIDA', 'EN_TRANSITO', 'PARCIALMENTE_RECIBIDA'] },
    },
    include: { proveedor: { select: { nombre_legal: true } } },
    take: 5,
  });

  const alertasCriticas = await prisma.alertaRiesgo.findMany({
    where: { empresa_id: empresaId, resuelta: false },
    take: 5,
  });

  const stocksBajos = await prisma.inventarioStock.findMany({
    where: { empresa_id: empresaId },
    include: { producto: true, almacen: true },
    take: 6,
  });

  const productosBajoMinimo = stocksBajos
    .filter((s) => Number(s.cantidad_actual) <= Number(s.stock_minimo))
    .map(
      (s) =>
        `- ${s.producto.nombre} (${s.producto.sku}): ${s.cantidad_actual} und en ${s.almacen.nombre} (Mínimo: ${s.stock_minimo})`
    )
    .join('\n');

  const liveContext = `
- Empresa: ${empresa?.razon_social || 'NexoSupply CR'}
- Moneda Base: ${empresa?.moneda_base || 'CRC'}
- Catálogo: ${totalProductos} productos activos, ${totalProveedores} proveedores activos.
- Órdenes en Proceso (${ordenesPendientes.length}):
${ordenesPendientes.map((o) => `  * #${o.numero_orden} con ${o.proveedor.nombre_legal} (${o.estado}, Entrega: ${o.fecha_prometida_entrega.toISOString().split('T')[0]})`).join('\n') || '  (Ninguna orden en tránsito actualmente)'}
- Alertas Críticas Activas (${alertasCriticas.length}):
${alertasCriticas.map((a) => `  * [${a.nivel_severidad}] ${a.titulo}: ${a.mensaje}`).join('\n') || '  (Sin alertas críticas pendientes)'}
- Existencias en Alerta de Stock Bajo:
${productosBajoMinimo || '  (Todas las existencias están sobre el mínimo)'}
Categoría de consulta seleccionada por el usuario: ${conversacion.categoria_opcion} (${CATEGORIAS_MENU[conversacion.categoria_opcion as keyof typeof CATEGORIAS_MENU] || ''})
`;

  // 3. Ensamblar historial de la conversación para DeepSeek
  const chatHistory: ChatMessage[] = conversacion.mensajes.map((m) => ({
    role: m.remitente === 'USUARIO' ? 'user' : 'assistant',
    content: m.contenido,
  }));
  chatHistory.push({ role: 'user', content: contenido.trim() });

  // 4. Invocar DeepSeek
  const { reply, tokensUsed } = await callDeepSeekChat(chatHistory, liveContext);

  // 5. Guardar respuesta del asistente
  const asistenteMsg = await prisma.mensajeChatbot.create({
    data: {
      conversacion_id: conversacionId,
      remitente: 'ASISTENTE',
      contenido: reply,
      tokens_usados: tokensUsed,
    },
  });

  // 6. Actualizar fecha de la conversación
  await prisma.conversacionChatbot.update({
    where: { id: conversacionId },
    data: { updatedAt: new Date() },
  });

  // 7. Registro en tabla ConsultaChatbotLog para auditoría histórica
  await prisma.consultaChatbotLog.create({
    data: {
      empresa_id: empresaId,
      usuario_id: userId,
      pregunta: contenido.trim(),
      respuesta_resumen: reply.slice(0, 500),
      tokens_usados: tokensUsed,
      fue_exitosa: true,
    },
  });

  return {
    mensaje: asistenteMsg,
    tokensUsed,
  };
}

export async function getChatbotStatus() {
  const hasKey = Boolean(process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY);
  return {
    disponible: true,
    motor: 'DeepSeek Chat (deepseek-chat)',
    proveedor: 'DeepSeek AI Platform',
    activo: hasKey,
    aislamientoMultiTenant: true,
    categoriasDisponibles: CATEGORIAS_MENU,
  };
}
