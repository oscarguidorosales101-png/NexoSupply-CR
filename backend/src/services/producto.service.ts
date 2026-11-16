import { prisma } from '../config/database';
import { NotFoundError, ConflictError } from '../errors/app-error';
import { registrarAuditoria } from './auditoria.service';
import { TipoAccionAuditoria } from '@prisma/client';

export async function listProductos(
  empresaId: string,
  options?: { categoriaId?: string; search?: string; bajoMinimo?: boolean }
) {
  const where: any = { empresa_id: empresaId, activo: true };

  if (options?.categoriaId) {
    where.categoria_id = options.categoriaId;
  }

  if (options?.search) {
    const q = options.search.trim();
    where.OR = [
      { nombre: { contains: q } },
      { sku: { contains: q } },
      { codigo_barras: { contains: q } },
    ];
  }

  const productos = await prisma.producto.findMany({
    where,
    include: {
      categoria: true,
      unidad_medida: true,
      inventario_stock: {
        include: { almacen: true },
      },
      productos_proveedores: {
        include: { proveedor: true },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  if (options?.bajoMinimo) {
    return productos.filter((p) => {
      const stockTotal = p.inventario_stock.reduce((sum, s) => sum + Number(s.cantidad_actual), 0);
      return stockTotal <= Number(p.stock_minimo_global);
    });
  }

  return productos;
}

export async function getProductoById(empresaId: string, productoId: string) {
  const producto = await prisma.producto.findFirst({
    where: { id: productoId, empresa_id: empresaId },
    include: {
      categoria: true,
      unidad_medida: true,
      inventario_stock: {
        include: { almacen: true },
      },
      productos_proveedores: {
        include: { proveedor: true },
      },
      historial_precios: {
        include: { proveedor: true },
        orderBy: { fecha_vigencia: 'desc' },
        take: 10,
      },
    },
  });

  if (!producto) {
    throw new NotFoundError('El producto solicitado no existe en su catálogo empresarial');
  }

  return producto;
}

export async function createProducto(empresaId: string, userId: string, data: any) {
  const existingSku = await prisma.producto.findUnique({
    where: {
      uk_producto_empresa_sku: {
        empresa_id: empresaId,
        sku: data.sku.trim().toUpperCase(),
      },
    },
  });

  if (existingSku) {
    throw new ConflictError(`El SKU [${data.sku}] ya se encuentra registrado en su catálogo`);
  }

  const producto = await prisma.producto.create({
    data: {
      empresa_id: empresaId,
      sku: data.sku.trim().toUpperCase(),
      codigo_barras: data.codigoBarras?.trim() || null,
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      categoria_id: data.categoriaId || null,
      unidad_medida_id: data.unidadMedidaId,
      costo_promedio: data.costoPromedio ?? 0,
      precio_referencia: data.precioReferencia ?? 0,
      stock_minimo_global: data.stockMinimoGlobal ?? 0,
      stock_seguridad: data.stockSeguridad ?? 0,
      activo: data.activo ?? true,
    },
    include: {
      categoria: true,
      unidad_medida: true,
    },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.CREATE,
    entidad: 'PRODUCTO',
    entidadId: producto.id,
    datosNuevos: { sku: producto.sku, nombre: producto.nombre },
  });

  return producto;
}

export async function updateProducto(empresaId: string, productoId: string, userId: string, data: any) {
  const actual = await getProductoById(empresaId, productoId);

  const actualizado = await prisma.producto.update({
    where: { id: actual.id },
    data: {
      nombre: data.nombre?.trim(),
      descripcion: data.descripcion?.trim(),
      categoria_id: data.categoriaId,
      unidad_medida_id: data.unidadMedidaId,
      costo_promedio: data.costoPromedio,
      precio_referencia: data.precioReferencia,
      stock_minimo_global: data.stockMinimoGlobal,
      stock_seguridad: data.stockSeguridad,
      activo: data.activo,
    },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.UPDATE,
    entidad: 'PRODUCTO',
    entidadId: productoId,
    datosAnteriores: actual,
    datosNuevos: actualizado,
  });

  return actualizado;
}

export async function linkProductoProveedor(
  empresaId: string,
  productoId: string,
  userId: string,
  data: any
) {
  await getProductoById(empresaId, productoId);

  const vinculo = await prisma.productoProveedor.upsert({
    where: {
      uk_producto_proveedor: {
        empresa_id: empresaId,
        producto_id: productoId,
        proveedor_id: data.proveedorId,
      },
    },
    update: {
      codigo_producto_proveedor: data.codigoProductoProveedor,
      precio_unitario_acordado: data.precioUnitarioAcordado,
      moneda: data.moneda,
      dias_entrega_esperados: data.diasEntregaEsperados,
      es_preferido: data.esPreferido ?? false,
    },
    create: {
      empresa_id: empresaId,
      producto_id: productoId,
      proveedor_id: data.proveedorId,
      codigo_producto_proveedor: data.codigoProductoProveedor,
      precio_unitario_acordado: data.precioUnitarioAcordado,
      moneda: data.moneda,
      dias_entrega_esperados: data.diasEntregaEsperados,
      es_preferido: data.esPreferido ?? false,
    },
  });

  // Guardar en Historial de Precios
  await prisma.historialPrecio.create({
    data: {
      empresa_id: empresaId,
      producto_id: productoId,
      proveedor_id: data.proveedorId,
      precio_unitario: data.precioUnitarioAcordado,
      moneda: data.moneda,
      motivo_cambio: 'Actualización contractual de catálogo producto-proveedor',
    },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.UPDATE,
    entidad: 'PRODUCTO_PROVEEDOR',
    entidadId: vinculo.id,
    datosNuevos: { productoId, proveedorId: data.proveedorId, precio: data.precioUnitarioAcordado },
  });

  return vinculo;
}

export async function listCategorias(empresaId: string) {
  return await prisma.categoria.findMany({
    where: { empresa_id: empresaId, activa: true },
    orderBy: { nombre: 'asc' },
  });
}

export async function createCategoria(empresaId: string, data: any) {
  return await prisma.categoria.create({
    data: {
      empresa_id: empresaId,
      codigo: data.codigo.trim().toUpperCase(),
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      activa: true,
    },
  });
}

export async function listUnidadesMedida(empresaId: string) {
  return await prisma.unidadMedida.findMany({
    where: { empresa_id: empresaId, activa: true },
    orderBy: { nombre: 'asc' },
  });
}

export async function createUnidadMedida(empresaId: string, data: any) {
  return await prisma.unidadMedida.create({
    data: {
      empresa_id: empresaId,
      codigo: data.codigo.trim().toUpperCase(),
      nombre: data.nombre.trim(),
      simbolo: data.simbolo.trim(),
      activa: true,
    },
  });
}
