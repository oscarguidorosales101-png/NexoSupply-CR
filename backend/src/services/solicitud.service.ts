import { prisma } from '../config/database';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../errors/app-error';
import { registrarAuditoria } from './auditoria.service';
import { EstadoSolicitudCompra, DecisionAprobacion, TipoAccionAuditoria } from '@prisma/client';

export async function listSolicitudes(empresaId: string, options?: { estado?: EstadoSolicitudCompra }) {
  const where: any = { empresa_id: empresaId };
  if (options?.estado) where.estado = options.estado;

  return await prisma.solicitudCompra.findMany({
    where,
    include: {
      solicitante: {
        select: { id: true, nombre_completo: true, email: true },
      },
      detalles: {
        include: { producto: true },
      },
      aprobaciones: {
        include: { aprobador: { select: { id: true, nombre_completo: true } } },
      },
      orden_generada: {
        select: { id: true, numero_orden: true, estado: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getSolicitudById(empresaId: string, solicitudId: string) {
  const solicitud = await prisma.solicitudCompra.findFirst({
    where: { id: solicitudId, empresa_id: empresaId },
    include: {
      solicitante: {
        select: { id: true, nombre_completo: true, email: true },
      },
      detalles: {
        include: { producto: { include: { unidad_medida: true } } },
      },
      aprobaciones: {
        include: { aprobador: { select: { id: true, nombre_completo: true } } },
      },
      orden_generada: true,
    },
  });

  if (!solicitud) {
    throw new NotFoundError('La solicitud de compra no existe en esta empresa');
  }

  return solicitud;
}

export async function createSolicitud(empresaId: string, userId: string, data: any) {
  // RN-03: Al menos un producto con cantidad > 0
  if (!data.detalles || data.detalles.length === 0) {
    throw new BadRequestError('La solicitud de compra debe contener al menos un producto (RN-03)');
  }

  const existingNum = await prisma.solicitudCompra.findUnique({
    where: {
      uk_solicitud_empresa_numero: {
        empresa_id: empresaId,
        numero_solicitud: data.numeroSolicitud.trim().toUpperCase(),
      },
    },
  });

  if (existingNum) {
    throw new ConflictError(`El número de solicitud [${data.numeroSolicitud}] ya existe`);
  }

  // Verificar que todos los productos existan y pertenezcan a la empresa
  const productoIds = data.detalles.map((d: any) => d.productoId);
  const productosValidos = await prisma.producto.findMany({
    where: {
      id: { in: productoIds },
      empresa_id: empresaId,
      activo: true,
    },
  });

  if (productosValidos.length !== productoIds.length) {
    throw new BadRequestError('Uno o más productos solicitados no son válidos o están inactivos');
  }

  // Calcular total estimado
  let totalEstimado = 0;
  const detallesMapeados = data.detalles.map((d: any) => {
    const subtotal = Number(d.cantidadSolicitada) * Number(d.precioUnitarioEstimado || 0);
    totalEstimado += subtotal;
    return {
      producto_id: d.productoId,
      cantidad_solicitada: d.cantidadSolicitada,
      precio_unitario_estimado: d.precioUnitarioEstimado || 0,
      subtotal,
      observaciones: d.observaciones || null,
    };
  });

  const solicitud = await prisma.$transaction(async (tx) => {
    const creada = await tx.solicitudCompra.create({
      data: {
        empresa_id: empresaId,
        solicitante_id: userId,
        numero_solicitud: data.numeroSolicitud.trim().toUpperCase(),
        justificacion: data.justificacion.trim(),
        moneda: data.moneda || 'CRC',
        estado: EstadoSolicitudCompra.PENDIENTE,
        total_estimado: totalEstimado,
        detalles: {
          create: detallesMapeados,
        },
      },
      include: { detalles: true },
    });

    return creada;
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.CREATE,
    entidad: 'SOLICITUD_COMPRA',
    entidadId: solicitud.id,
    datosNuevos: { numero: solicitud.numero_solicitud, total: totalEstimado },
  });

  return solicitud;
}

export async function decideAprobacionSolicitud(
  empresaId: string,
  solicitudId: string,
  userId: string,
  decision: DecisionAprobacion,
  comentario?: string
) {
  const solicitud = await getSolicitudById(empresaId, solicitudId);

  if (solicitud.estado !== EstadoSolicitudCompra.PENDIENTE) {
    throw new ConflictError(`La solicitud no está en estado PENDIENTE (Estado actual: ${solicitud.estado})`);
  }

  // Política de separación de funciones: Un usuario no puede auto-aprobar su solicitud si supera el umbral
  const config = await prisma.configuracionEmpresa.findUnique({
    where: { empresa_id: empresaId },
  });
  const umbral = Number(config?.monto_max_autoaprobacion ?? 500000);

  if (solicitud.solicitante_id === userId && Number(solicitud.total_estimado) > umbral) {
    throw new ForbiddenError(
      'Política de Separación de Funciones: No puede aprobar su propia solicitud cuando el monto supera el umbral autorizado'
    );
  }

  const nuevoEstado =
    decision === DecisionAprobacion.APROBADA
      ? EstadoSolicitudCompra.APROBADA
      : EstadoSolicitudCompra.RECHAZADA;

  const resultado = await prisma.$transaction(async (tx) => {
    // 1. Registrar aprobación
    await tx.aprobacionSolicitud.create({
      data: {
        solicitud_id: solicitudId,
        aprobador_id: userId,
        decision,
        comentario: comentario || null,
      },
    });

    // 2. Actualizar estado de solicitud
    const updated = await tx.solicitudCompra.update({
      where: { id: solicitudId },
      data: { estado: nuevoEstado },
    });

    return updated;
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: decision === DecisionAprobacion.APROBADA ? TipoAccionAuditoria.APROBACION : TipoAccionAuditoria.RECHAZO,
    entidad: 'SOLICITUD_COMPRA',
    entidadId: solicitudId,
    datosNuevos: { nuevoEstado, comentario },
  });

  return resultado;
}
