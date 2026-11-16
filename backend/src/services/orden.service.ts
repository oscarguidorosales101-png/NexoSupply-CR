import { prisma } from '../config/database';
import { NotFoundError, BadRequestError, ConflictError } from '../errors/app-error';
import { registrarAuditoria } from './auditoria.service';
import { EstadoOrdenCompra, EstadoSolicitudCompra, TipoAccionAuditoria } from '@prisma/client';

export async function listOrdenes(
  empresaId: string,
  options?: { estado?: EstadoOrdenCompra; proveedorId?: string }
) {
  const where: any = { empresa_id: empresaId };
  if (options?.estado) where.estado = options.estado;
  if (options?.proveedorId) where.proveedor_id = options.proveedorId;

  return await prisma.ordenCompra.findMany({
    where,
    include: {
      proveedor: {
        select: { id: true, nombre_legal: true, identificador_fiscal: true },
      },
      almacen_destino: {
        select: { id: true, codigo: true, nombre: true },
      },
      detalles: {
        include: { producto: true },
      },
      recepciones: {
        select: { id: true, numero_recepcion: true, fecha_recepcion: true, estado: true },
      },
    },
    orderBy: { fecha_emision: 'desc' },
  });
}

export async function getOrdenById(empresaId: string, ordenId: string) {
  const orden = await prisma.ordenCompra.findFirst({
    where: { id: ordenId, empresa_id: empresaId },
    include: {
      proveedor: true,
      almacen_destino: true,
      creada_por: { select: { id: true, nombre_completo: true, email: true } },
      detalles: {
        include: {
          producto: { include: { unidad_medida: true } },
        },
      },
      recepciones: {
        include: {
          recibido_por: { select: { id: true, nombre_completo: true } },
          detalles: true,
        },
      },
    },
  });

  if (!orden) {
    throw new NotFoundError('La orden de compra no existe en esta empresa');
  }

  return orden;
}

export async function createOrdenFromSolicitud(
  empresaId: string,
  userId: string,
  solicitudId: string,
  data: {
    proveedorId: string;
    almacenDestinoId: string;
    numeroOrden: string;
    fechaPrometidaEntrega: Date | string;
    condicionesPago?: string;
    notas?: string;
  }
) {
  // RN-04: La solicitud DEBE estar en estado APROBADA
  const solicitud = await prisma.solicitudCompra.findFirst({
    where: { id: solicitudId, empresa_id: empresaId },
    include: { detalles: true },
  });

  if (!solicitud) {
    throw new NotFoundError('Solicitud de compra no encontrada');
  }

  if (solicitud.estado !== EstadoSolicitudCompra.APROBADA) {
    throw new ConflictError(
      `RN-04 Violada: La solicitud debe estar aprobada antes de generar la orden correspondiente (Estado actual: ${solicitud.estado})`
    );
  }

  // Verificar proveedor activo (RN-02)
  const proveedor = await prisma.proveedor.findFirst({
    where: { id: data.proveedorId, empresa_id: empresaId },
  });

  if (!proveedor || !proveedor.activo) {
    throw new BadRequestError('El proveedor seleccionado no existe o está inactivo (RN-02)');
  }

  // Verificar almacén
  const almacen = await prisma.almacen.findFirst({
    where: { id: data.almacenDestinoId, empresa_id: empresaId, activo: true },
  });

  if (!almacen) {
    throw new BadRequestError('El almacén de destino no es válido o está inactivo');
  }

  // Comprobar número de orden único
  const existingNum = await prisma.ordenCompra.findUnique({
    where: {
      uk_orden_empresa_numero: {
        empresa_id: empresaId,
        numero_orden: data.numeroOrden.trim().toUpperCase(),
      },
    },
  });

  if (existingNum) {
    throw new ConflictError(`El número de orden [${data.numeroOrden}] ya existe en la empresa`);
  }

  // Calcular totales
  let subtotal = 0;
  let impuestos = 0;
  const detallesOrden = solicitud.detalles.map((d) => {
    const itemSubtotal = Number(d.cantidad_solicitada) * Number(d.precio_unitario_estimado);
    const itemImpuesto = itemSubtotal * 0.13; // 13% IVA estándar CR
    subtotal += itemSubtotal;
    impuestos += itemImpuesto;

    return {
      producto_id: d.producto_id,
      cantidad_ordenada: d.cantidad_solicitada,
      cantidad_recibida: 0,
      precio_unitario: d.precio_unitario_estimado,
      porcentaje_descuento: 0,
      impuesto_porcentaje: 13.0,
      subtotal: itemSubtotal,
    };
  });

  const total = subtotal + impuestos;

  return await prisma.$transaction(async (tx) => {
    const nuevaOrden = await tx.ordenCompra.create({
      data: {
        empresa_id: empresaId,
        solicitud_origen_id: solicitud.id,
        proveedor_id: proveedor.id,
        almacen_destino_id: almacen.id,
        creada_por_id: userId,
        numero_orden: data.numeroOrden.trim().toUpperCase(),
        fecha_emision: new Date(),
        fecha_prometida_entrega: new Date(data.fechaPrometidaEntrega),
        estado: EstadoOrdenCompra.EMITIDA,
        moneda: solicitud.moneda,
        subtotal,
        impuestos,
        total,
        condiciones_pago: data.condicionesPago || `Crédito comercial ${proveedor.terminos_pago_dias} días`,
        notas: data.notas || null,
        detalles: {
          create: detallesOrden,
        },
      },
      include: { detalles: true },
    });

    // Actualizar solicitud de compra a CONVERTIDA_EN_ORDEN
    await tx.solicitudCompra.update({
      where: { id: solicitud.id },
      data: { estado: EstadoSolicitudCompra.CONVERTIDA_EN_ORDEN },
    });

    await registrarAuditoria({
      empresaId,
      usuarioId: userId,
      accion: TipoAccionAuditoria.CREATE,
      entidad: 'ORDEN_COMPRA',
      entidadId: nuevaOrden.id,
      datosNuevos: { numeroOrden: nuevaOrden.numero_orden, total: nuevaOrden.total },
    });

    return nuevaOrden;
  });
}

export async function createOrdenDirecta(empresaId: string, userId: string, data: any) {
  const proveedor = await prisma.proveedor.findFirst({
    where: { id: data.proveedorId, empresa_id: empresaId, activo: true },
  });

  if (!proveedor) {
    throw new BadRequestError('Proveedor no válido o inactivo (RN-02)');
  }

  const almacen = await prisma.almacen.findFirst({
    where: { id: data.almacenDestinoId, empresa_id: empresaId, activo: true },
  });

  if (!almacen) {
    throw new BadRequestError('Almacén no válido');
  }

  let subtotal = 0;
  let impuestos = 0;
  const detallesMapeados = data.detalles.map((d: any) => {
    const itemSubtotal = Number(d.cantidadOrdenada) * Number(d.precioUnitario);
    const itemDesc = itemSubtotal * (Number(d.porcentajeDescuento || 0) / 100);
    const baseImponible = itemSubtotal - itemDesc;
    const itemImp = baseImponible * (Number(d.impuestoPorcentaje || 13) / 100);

    subtotal += baseImponible;
    impuestos += itemImp;

    return {
      producto_id: d.productoId,
      cantidad_ordenada: d.cantidadOrdenada,
      cantidad_recibida: 0,
      precio_unitario: d.precioUnitario,
      porcentaje_descuento: d.porcentajeDescuento || 0,
      impuesto_porcentaje: d.impuestoPorcentaje || 13.0,
      subtotal: baseImponible,
    };
  });

  const total = subtotal + impuestos;

  const orden = await prisma.ordenCompra.create({
    data: {
      empresa_id: empresaId,
      proveedor_id: proveedor.id,
      almacen_destino_id: almacen.id,
      creada_por_id: userId,
      numero_orden: data.numeroOrden.trim().toUpperCase(),
      fecha_emision: new Date(),
      fecha_prometida_entrega: new Date(data.fechaPrometidaEntrega),
      estado: EstadoOrdenCompra.EMITIDA,
      moneda: data.moneda || 'CRC',
      tasa_cambio: data.tasaCambio || 1.0,
      subtotal,
      impuestos,
      total,
      condiciones_pago: data.condicionesPago || null,
      notas: data.notas || null,
      detalles: {
        create: detallesMapeados,
      },
    },
    include: { detalles: true },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.CREATE,
    entidad: 'ORDEN_COMPRA',
    entidadId: orden.id,
    datosNuevos: { numeroOrden: orden.numero_orden, total: orden.total },
  });

  return orden;
}
