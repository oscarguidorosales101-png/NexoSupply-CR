import { prisma } from '../config/database';

export async function getDashboardKPIs(empresaId: string) {
  // 1. Conteo de entidades activas
  const totalProveedores = await prisma.proveedor.count({
    where: { empresa_id: empresaId, activo: true },
  });

  const totalProductos = await prisma.producto.count({
    where: { empresa_id: empresaId, activo: true },
  });

  const ordenesActivas = await prisma.ordenCompra.count({
    where: {
      empresa_id: empresaId,
      estado: { in: ['EMITIDA', 'EN_TRANSITO', 'PARCIALMENTE_RECIBIDA'] },
    },
  });

  const solicitudesPendientes = await prisma.solicitudCompra.count({
    where: { empresa_id: empresaId, estado: 'PENDIENTE' },
  });

  // 2. Cálculo real de existencias y productos bajo mínimo
  const stocks = await prisma.inventarioStock.findMany({
    where: { empresa_id: empresaId },
    include: { producto: true },
  });

  let valorTotalInventario = 0;
  let productosBajoMinimo = 0;

  for (const s of stocks) {
    const cant = Number(s.cantidad_actual);
    const costo = Number(s.producto.costo_promedio);
    const min = Number(s.stock_minimo);

    valorTotalInventario += cant * costo;
    if (min > 0 && cant <= min) {
      productosBajoMinimo++;
    }
  }

  // 3. Calificación promedio de proveedores
  const evaluaciones = await prisma.evaluacionProveedor.findMany({
    where: { empresa_id: empresaId },
    select: { calificacion_global: true },
  });

  const promedioEvaluacion =
    evaluaciones.length > 0
      ? evaluaciones.reduce((sum, e) => sum + Number(e.calificacion_global), 0) / evaluaciones.length
      : 100.0;

  // 4. Alertas pendientes
  const alertasPendientes = await prisma.alertaRiesgo.count({
    where: { empresa_id: empresaId, resuelta: false },
  });

  // 5. Órdenes recientes
  const ordenesRecientes = await prisma.ordenCompra.findMany({
    where: { empresa_id: empresaId },
    include: {
      proveedor: { select: { nombre_legal: true } },
    },
    orderBy: { fecha_emision: 'desc' },
    take: 5,
  });

  // 6. Gasto total acumulado por proveedor
  const topProveedoresRaw = await prisma.ordenCompra.groupBy({
    by: ['proveedor_id'],
    where: {
      empresa_id: empresaId,
      estado: { in: ['EMITIDA', 'EN_TRANSITO', 'PARCIALMENTE_RECIBIDA', 'COMPLETADA'] },
    },
    _sum: {
      total: true,
    },
    orderBy: {
      _sum: {
        total: 'desc',
      },
    },
    take: 5,
  });

  const topProveedores = await Promise.all(
    topProveedoresRaw.map(async (item) => {
      const prov = await prisma.proveedor.findUnique({
        where: { id: item.proveedor_id },
        select: { nombre_legal: true, clasificacion: true },
      });
      return {
        proveedorId: item.proveedor_id,
        nombre: prov?.nombre_legal || 'Proveedor Desconocido',
        clasificacion: prov?.clasificacion || 'B',
        montoTotal: Number(item._sum.total ?? 0),
      };
    })
  );

  return {
    kpis: {
      totalProveedores,
      totalProductos,
      ordenesActivas,
      solicitudesPendientes,
      productosBajoMinimo,
      valorTotalInventario: Number(valorTotalInventario.toFixed(2)),
      promedioDesempenoProveedores: Number(promedioEvaluacion.toFixed(2)),
      alertasPendientes,
    },
    ordenesRecientes: ordenesRecientes.map((o) => ({
      id: o.id,
      numeroOrden: o.numero_orden,
      proveedor: o.proveedor.nombre_legal,
      total: Number(o.total),
      moneda: o.moneda,
      estado: o.estado,
      fechaPrometida: o.fecha_prometida_entrega,
    })),
    topProveedores,
  };
}

export async function listRegistrosAuditoria(empresaId: string, limit = 50) {
  return await prisma.registroAuditoria.findMany({
    where: { empresa_id: empresaId },
    include: {
      usuario: { select: { id: true, nombre_completo: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
