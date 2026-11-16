import { prisma } from '../config/database';
import { NotFoundError, BadRequestError, ConflictError } from '../errors/app-error';
import { registrarAuditoria } from './auditoria.service';
import {
  EstadoOrdenCompra,
  EstadoRecepcion,
  TipoMovimientoInventario,
  TipoAccionAuditoria,
  TipoRiesgo,
  NivelSeveridadAlerta,
} from '@prisma/client';

export interface DetalleRecepcionInput {
  detalleOrdenId: string;
  productoId: string;
  cantidadRecibida: number;
  cantidadRechazada?: number;
  motivoRechazo?: string;
  costoUnitarioReal?: number;
}

export interface RegistrarRecepcionDTO {
  ordenCompraId: string;
  almacenId: string;
  numeroRecepcion: string;
  numeroGuiaFactura?: string;
  observaciones?: string;
  detalles: DetalleRecepcionInput[];
}

export async function registrarRecepcionFisica(
  empresaId: string,
  userId: string,
  dto: RegistrarRecepcionDTO
) {
  // 1. Validar orden de compra y su pertenencia a la empresa (RN-06)
  const orden = await prisma.ordenCompra.findFirst({
    where: { id: dto.ordenCompraId, empresa_id: empresaId },
    include: {
      detalles: true,
      proveedor: true,
    },
  });

  if (!orden) {
    throw new NotFoundError('La orden de compra no existe en esta empresa (RN-06)');
  }

  if (
    orden.estado !== EstadoOrdenCompra.EMITIDA &&
    orden.estado !== EstadoOrdenCompra.EN_TRANSITO &&
    orden.estado !== EstadoOrdenCompra.PARCIALMENTE_RECIBIDA
  ) {
    throw new ConflictError(
      `No se puede recibir una orden en estado [${orden.estado}]. Debe estar EMITIDA, EN_TRANSITO o PARCIALMENTE_RECIBIDA.`
    );
  }

  // 2. Validar almacén
  const almacen = await prisma.almacen.findFirst({
    where: { id: dto.almacenId, empresa_id: empresaId, activo: true },
  });

  if (!almacen) {
    throw new BadRequestError('El almacén seleccionado no es válido o está inactivo');
  }

  // 3. Obtener política de tolerancia de sobrentrega
  const config = await prisma.configuracionEmpresa.findUnique({
    where: { empresa_id: empresaId },
  });
  const toleranciaPorc = Number(config?.tolerancia_sobrentrega_porc ?? 0);

  // 4. Comprobar número de recepción único por empresa
  const existingRec = await prisma.recepcionCompra.findUnique({
    where: {
      uk_recepcion_empresa_numero: {
        empresa_id: empresaId,
        numero_recepcion: dto.numeroRecepcion.trim().toUpperCase(),
      },
    },
  });

  if (existingRec) {
    throw new ConflictError(`El número de recepción [${dto.numeroRecepcion}] ya existe en la empresa`);
  }

  // 5. Transacción ACID Estricta con Prisma
  return await prisma.$transaction(async (tx) => {
    let tieneDiferencias = false;
    const detallesRecepcionCrear: any[] = [];
    const itemsActualizarOrden: { id: string; nuevaCantidadRecibida: number }[] = [];

    for (const item of dto.detalles) {
      const detalleOrden = orden.detalles.find((d) => d.id === item.detalleOrdenId);
      if (!detalleOrden) {
        throw new BadRequestError(
          `El ítem con detalleOrdenId [${item.detalleOrdenId}] no pertenece a esta orden de compra`
        );
      }

      if (detalleOrden.producto_id !== item.productoId) {
        throw new BadRequestError('Inconsistencia en el producto del detalle de orden');
      }

      const cantOrdenada = Number(detalleOrden.cantidad_ordenada);
      const cantYaRecibida = Number(detalleOrden.cantidad_recibida);
      const cantPendiente = cantOrdenada - cantYaRecibida;
      const cantPermitidaMax = cantPendiente * (1 + toleranciaPorc / 100);

      const cantEntregada = Number(item.cantidadRecibida);
      const cantRechazada = Number(item.cantidadRechazada || 0);

      // RN-07: Control de tolerancia de sobrentregas
      if (cantEntregada > cantPermitidaMax) {
        throw new BadRequestError(
          `RN-07 Violada: La cantidad recibida (${cantEntregada}) supera la cantidad autorizada pendiente (${cantPendiente}) con tolerancia máxima del ${toleranciaPorc}%`
        );
      }

      if (cantEntregada < cantPendiente || cantRechazada > 0) {
        tieneDiferencias = true;
      }

      const nuevaCantidadRecibida = cantYaRecibida + cantEntregada;
      itemsActualizarOrden.push({
        id: detalleOrden.id,
        nuevaCantidadRecibida,
      });

      const costoReal = Number(item.costoUnitarioReal || detalleOrden.precio_unitario);

      detallesRecepcionCrear.push({
        detalle_orden_id: detalleOrden.id,
        producto_id: item.productoId,
        cantidad_recibida: cantEntregada,
        cantidad_rechazada: cantRechazada,
        motivo_rechazo: item.motivoRechazo || null,
        costo_unitario_real: costoReal,
      });

      // 6. Actualizar inventario físico y registrar movimiento de Kardex (RN-08)
      // Bloqueo / control de concurrencia: buscar o inicializar registro de stock
      let stockRecord = await tx.inventarioStock.findUnique({
        where: {
          uk_inventario_empresa_alm_prod: {
            empresa_id: empresaId,
            almacen_id: almacen.id,
            producto_id: item.productoId,
          },
        },
      });

      const stockAnterior = Number(stockRecord?.cantidad_actual ?? 0);
      const stockPosterior = stockAnterior + cantEntregada;

      if (!stockRecord) {
        stockRecord = await tx.inventarioStock.create({
          data: {
            empresa_id: empresaId,
            almacen_id: almacen.id,
            producto_id: item.productoId,
            cantidad_actual: stockPosterior,
            stock_minimo: 0,
          },
        });
      } else {
        await tx.inventarioStock.update({
          where: { id: stockRecord.id },
          data: {
            cantidad_actual: stockPosterior,
          },
        });
      }

      // Insertar Kardex Inmutable
      await tx.movimientoInventario.create({
        data: {
          empresa_id: empresaId,
          almacen_id: almacen.id,
          producto_id: item.productoId,
          usuario_id: userId,
          tipo_movimiento: TipoMovimientoInventario.ENTRADA_COMPRA,
          cantidad: cantEntregada,
          costo_unitario: costoReal,
          stock_anterior: stockAnterior,
          stock_posterior: stockPosterior,
          referencia_tipo: 'RECEPCION',
          referencia_id: dto.numeroRecepcion.trim().toUpperCase(),
          motivo: `Ingreso por Recepción de Compra ${dto.numeroRecepcion} (Orden ${orden.numero_orden})`,
        },
      });

      // Recalcular Costo Promedio del Producto
      const producto = await tx.producto.findUnique({ where: { id: item.productoId } });
      if (producto) {
        const costoAntiguo = Number(producto.costo_promedio);
        const nuevoCostoPromedio =
          stockPosterior > 0
            ? (stockAnterior * costoAntiguo + cantEntregada * costoReal) / stockPosterior
            : costoReal;

        await tx.producto.update({
          where: { id: item.productoId },
          data: { costo_promedio: nuevoCostoPromedio },
        });

        // Registrar en Historial de Precios (RN-11)
        await tx.historialPrecio.create({
          data: {
            empresa_id: empresaId,
            producto_id: item.productoId,
            proveedor_id: orden.proveedor_id,
            orden_compra_id: orden.id,
            precio_unitario: costoReal,
            moneda: orden.moneda,
            motivo_cambio: `Recepción física ${dto.numeroRecepcion} de Orden ${orden.numero_orden}`,
          },
        });
      }
    }

    // 7. Crear el encabezado de recepción y sus detalles
    const recepcion = await tx.recepcionCompra.create({
      data: {
        empresa_id: empresaId,
        orden_compra_id: orden.id,
        almacen_id: almacen.id,
        recibido_por_id: userId,
        numero_recepcion: dto.numeroRecepcion.trim().toUpperCase(),
        numero_guia_factura: dto.numeroGuiaFactura || null,
        observaciones: dto.observaciones || null,
        estado: tieneDiferencias ? EstadoRecepcion.CON_DIFERENCIAS : EstadoRecepcion.CONFORME,
        detalles: {
          create: detallesRecepcionCrear,
        },
      },
      include: { detalles: true },
    });

    // 8. Actualizar las cantidades recibidas en cada detalle de la orden
    for (const act of itemsActualizarOrden) {
      await tx.detalleOrdenCompra.update({
        where: { id: act.id },
        data: { cantidad_recibida: act.nuevaCantidadRecibida },
      });
    }

    // 9. Evaluar si la orden quedó totalmente completada o parcialmente recibida
    const ordenActualizada = await tx.ordenCompra.findUnique({
      where: { id: orden.id },
      include: { detalles: true },
    });

    const todasCompletas = ordenActualizada?.detalles.every(
      (d) => Number(d.cantidad_recibida) >= Number(d.cantidad_ordenada)
    );

    const nuevoEstadoOrden = todasCompletas
      ? EstadoOrdenCompra.COMPLETADA
      : EstadoOrdenCompra.PARCIALMENTE_RECIBIDA;

    await tx.ordenCompra.update({
      where: { id: orden.id },
      data: { estado: nuevoEstadoOrden },
    });

    // 10. Control de puntualidad y alertas si hubo retraso
    const hoy = new Date();
    if (hoy > orden.fecha_prometida_entrega) {
      const diasRetraso = Math.ceil(
        (hoy.getTime() - orden.fecha_prometida_entrega.getTime()) / (1000 * 3600 * 24)
      );
      await tx.alertaRiesgo.create({
        data: {
          empresa_id: empresaId,
          tipo_riesgo: TipoRiesgo.RETRASO_PROVEEDOR,
          nivel_severidad: NivelSeveridadAlerta.ADVERTENCIA,
          titulo: `Entrega con retraso: Proveedor ${orden.proveedor.nombre_legal}`,
          mensaje: `La orden ${orden.numero_orden} fue recibida con ${diasRetraso} día(s) de demora respecto a la fecha prometida.`,
          recurso_tipo: 'ORDEN',
          recurso_id: orden.id,
        },
      });
    }

    // 11. Auditoría
    await registrarAuditoria({
      empresaId,
      usuarioId: userId,
      accion: TipoAccionAuditoria.RECEPCION,
      entidad: 'RECEPCION_COMPRA',
      entidadId: recepcion.id,
      datosNuevos: {
        numeroRecepcion: recepcion.numero_recepcion,
        ordenId: orden.id,
        estadoRecepcion: recepcion.estado,
        nuevoEstadoOrden,
      },
    });

    return {
      recepcion,
      nuevoEstadoOrden,
    };
  });
}

export async function listRecepciones(empresaId: string, options?: { ordenId?: string }) {
  const where: any = { empresa_id: empresaId };
  if (options?.ordenId) where.orden_compra_id = options.ordenId;

  return await prisma.recepcionCompra.findMany({
    where,
    include: {
      orden_compra: {
        select: { id: true, numero_orden: true, proveedor: { select: { nombre_legal: true } } },
      },
      almacen: { select: { id: true, codigo: true, nombre: true } },
      recibido_por: { select: { id: true, nombre_completo: true } },
      detalles: {
        include: { producto: true },
      },
    },
    orderBy: { fecha_recepcion: 'desc' },
  });
}
