import { prisma } from '../config/database';
import { NotFoundError, BadRequestError } from '../errors/app-error';
import { registrarAuditoria } from './auditoria.service';
import { TipoMovimientoInventario, TipoAccionAuditoria } from '@prisma/client';

export async function getStockOverview(empresaId: string, options?: { almacenId?: string; bajoMinimo?: boolean }) {
  const where: any = { empresa_id: empresaId };
  if (options?.almacenId) where.almacen_id = options.almacenId;

  const stockRecords = await prisma.inventarioStock.findMany({
    where,
    include: {
      almacen: true,
      producto: {
        include: {
          unidad_medida: true,
          categoria: true,
        },
      },
    },
    orderBy: { producto: { nombre: 'asc' } },
  });

  if (options?.bajoMinimo) {
    return stockRecords.filter((s) => Number(s.cantidad_actual) <= Number(s.stock_minimo));
  }

  return stockRecords;
}

export async function getKardexMovements(empresaId: string, options?: { productoId?: string; almacenId?: string; limit?: number }) {
  const where: any = { empresa_id: empresaId };
  if (options?.productoId) where.producto_id = options.productoId;
  if (options?.almacenId) where.almacen_id = options.almacenId;

  return await prisma.movimientoInventario.findMany({
    where,
    include: {
      producto: { select: { id: true, sku: true, nombre: true } },
      almacen: { select: { id: true, codigo: true, nombre: true } },
      usuario: { select: { id: true, nombre_completo: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
  });
}

export async function adjustInventoryStock(
  empresaId: string,
  userId: string,
  data: {
    almacenId: string;
    productoId: string;
    tipoMovimiento: 'ENTRADA_AJUSTE' | 'SALIDA_AJUSTE';
    cantidad: number;
    motivo: string;
  }
) {
  // RN-10: Justificación obligatoria y usuario registrado
  if (!data.motivo || data.motivo.trim().length < 5) {
    throw new BadRequestError('RN-10: Todo ajuste de inventario debe registrar motivo técnico justificado');
  }

  const almacen = await prisma.almacen.findFirst({
    where: { id: data.almacenId, empresa_id: empresaId, activo: true },
  });
  if (!almacen) throw new NotFoundError('Almacén no encontrado');

  const producto = await prisma.producto.findFirst({
    where: { id: data.productoId, empresa_id: empresaId, activo: true },
  });
  if (!producto) throw new NotFoundError('Producto no encontrado');

  const cantidadAjuste = Number(data.cantidad);
  if (cantidadAjuste <= 0) {
    throw new BadRequestError('La cantidad a ajustar debe ser mayor a cero');
  }

  return await prisma.$transaction(async (tx) => {
    let stockRecord = await tx.inventarioStock.findUnique({
      where: {
        uk_inventario_empresa_alm_prod: {
          empresa_id: empresaId,
          almacen_id: data.almacenId,
          producto_id: data.productoId,
        },
      },
    });

    const stockAnterior = Number(stockRecord?.cantidad_actual ?? 0);
    let stockPosterior: number;

    if (data.tipoMovimiento === 'ENTRADA_AJUSTE') {
      stockPosterior = stockAnterior + cantidadAjuste;
    } else {
      // RN-09: Prohibición estricta de saldos negativos
      if (stockAnterior < cantidadAjuste) {
        throw new BadRequestError(
          `RN-09 Violada: Saldo insuficiente. Existencia actual (${stockAnterior}) menor que la salida requerida (${cantidadAjuste})`
        );
      }
      stockPosterior = stockAnterior - cantidadAjuste;
    }

    if (!stockRecord) {
      stockRecord = await tx.inventarioStock.create({
        data: {
          empresa_id: empresaId,
          almacen_id: data.almacenId,
          producto_id: data.productoId,
          cantidad_actual: stockPosterior,
        },
      });
    } else {
      await tx.inventarioStock.update({
        where: { id: stockRecord.id },
        data: { cantidad_actual: stockPosterior },
      });
    }

    // Registrar en Kardex Inmutable (RN-08)
    const movimiento = await tx.movimientoInventario.create({
      data: {
        empresa_id: empresaId,
        almacen_id: data.almacenId,
        producto_id: data.productoId,
        usuario_id: userId,
        tipo_movimiento:
          data.tipoMovimiento === 'ENTRADA_AJUSTE'
            ? TipoMovimientoInventario.ENTRADA_AJUSTE
            : TipoMovimientoInventario.SALIDA_AJUSTE,
        cantidad: cantidadAjuste,
        costo_unitario: producto.costo_promedio,
        stock_anterior: stockAnterior,
        stock_posterior: stockPosterior,
        referencia_tipo: 'AJUSTE',
        motivo: data.motivo.trim(),
      },
    });

    await registrarAuditoria({
      empresaId,
      usuarioId: userId,
      accion: TipoAccionAuditoria.AJUSTE_KARDEX,
      entidad: 'INVENTARIO_STOCK',
      entidadId: stockRecord.id,
      datosAnteriores: { stockAnterior },
      datosNuevos: { stockPosterior, motivo: data.motivo },
    });

    return {
      stockAnterior,
      stockPosterior,
      movimientoId: movimiento.id,
    };
  });
}

export async function listAlmacenes(empresaId: string) {
  return await prisma.almacen.findMany({
    where: { empresa_id: empresaId },
    include: {
      _count: { select: { inventario_stock: true } },
    },
    orderBy: { es_principal: 'desc' },
  });
}

export async function createAlmacen(empresaId: string, data: any) {
  const existingCodigo = await prisma.almacen.findUnique({
    where: {
      uk_almacen_empresa_codigo: {
        empresa_id: empresaId,
        codigo: data.codigo.trim().toUpperCase(),
      },
    },
  });

  if (existingCodigo) {
    throw new BadRequestError(`El código de almacén [${data.codigo}] ya está en uso`);
  }

  return await prisma.almacen.create({
    data: {
      empresa_id: empresaId,
      codigo: data.codigo.trim().toUpperCase(),
      nombre: data.nombre.trim(),
      ubicacion: data.ubicacion?.trim() || null,
      responsable: data.responsable?.trim() || null,
      es_principal: data.esPrincipal ?? false,
      activo: data.activo ?? true,
    },
  });
}
