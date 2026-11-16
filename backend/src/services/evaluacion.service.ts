import { prisma } from '../config/database';
import { NotFoundError, BadRequestError } from '../errors/app-error';
import { registrarAuditoria } from './auditoria.service';
import { CategoriaDesempeno, TipoAccionAuditoria } from '@prisma/client';

export async function calculateSupplierEvaluation(empresaId: string, proveedorId: string, periodo: string) {
  const proveedor = await prisma.proveedor.findFirst({
    where: { id: proveedorId, empresa_id: empresaId },
  });
  if (!proveedor) throw new NotFoundError('Proveedor no encontrado');

  // Buscar órdenes asociadas a este proveedor
  const ordenes = await prisma.ordenCompra.findMany({
    where: {
      empresa_id: empresaId,
      proveedor_id: proveedorId,
      recepciones: { some: {} },
    },
    include: {
      detalles: true,
      recepciones: true,
    },
  });

  const totalOrdenes = ordenes.length;
  if (totalOrdenes === 0) {
    // Si no tiene órdenes recibidas aún, retornar evaluación base
    return await prisma.evaluacionProveedor.upsert({
      where: {
        uk_evaluacion_empresa_prov_periodo: {
          empresa_id: empresaId,
          proveedor_id: proveedorId,
          periodo,
        },
      },
      update: {
        ordenes_evaluadas: 0,
        indice_puntualidad: 100.0,
        indice_cumplimiento_cant: 100.0,
        indice_incidencias: 100.0,
        indice_precios: 100.0,
        calificacion_global: 100.0,
        categoria_desempeno: CategoriaDesempeno.CONFIABLE,
        observaciones: 'Sin órdenes completadas en el período evaluado',
      },
      create: {
        empresa_id: empresaId,
        proveedor_id: proveedorId,
        periodo,
        ordenes_evaluadas: 0,
        indice_puntualidad: 100.0,
        indice_cumplimiento_cant: 100.0,
        indice_incidencias: 100.0,
        indice_precios: 100.0,
        calificacion_global: 100.0,
        categoria_desempeno: CategoriaDesempeno.CONFIABLE,
        observaciones: 'Sin órdenes completadas en el período evaluado',
      },
    });
  }

  // 1. OTD (Puntualidad): Entregas a tiempo
  let ordenesATiempo = 0;
  let totalUnidadesOrdenadas = 0;
  let totalUnidadesRecibidas = 0;

  for (const o of ordenes) {
    const primeraRecepcion = o.recepciones[0];
    if (primeraRecepcion && primeraRecepcion.fecha_recepcion <= o.fecha_prometida_entrega) {
      ordenesATiempo++;
    }

    for (const det of o.detalles) {
      totalUnidadesOrdenadas += Number(det.cantidad_ordenada);
      totalUnidadesRecibidas += Number(det.cantidad_recibida);
    }
  }

  const indicePuntualidad = (ordenesATiempo / totalOrdenes) * 100;

  // 2. OFR (Cumplimiento de Cantidades)
  const indiceCantidades =
    totalUnidadesOrdenadas > 0
      ? Math.min(100, (totalUnidadesRecibidas / totalUnidadesOrdenadas) * 100)
      : 100;

  // 3. Incidencias
  const incidenciasCount = await prisma.incidenciaProveedor.count({
    where: {
      empresa_id: empresaId,
      proveedor_id: proveedorId,
    },
  });

  const penalizacionIncidencias = Math.min(100, incidenciasCount * 15);
  const indiceIncidencias = Math.max(0, 100 - penalizacionIncidencias);

  // 4. Calificación Ponderada Final (RN-13)
  const calificacionGlobal =
    indicePuntualidad * 0.4 + indiceCantidades * 0.35 + indiceIncidencias * 0.25;

  let categoriaDesempeno: CategoriaDesempeno = CategoriaDesempeno.CRITICO;
  if (calificacionGlobal >= 90) {
    categoriaDesempeno = CategoriaDesempeno.EXCELENTE;
  } else if (calificacionGlobal >= 75) {
    categoriaDesempeno = CategoriaDesempeno.CONFIABLE;
  } else if (calificacionGlobal >= 60) {
    categoriaDesempeno = CategoriaDesempeno.EN_OBSERVACION;
  }

  return await prisma.evaluacionProveedor.upsert({
    where: {
      uk_evaluacion_empresa_prov_periodo: {
        empresa_id: empresaId,
        proveedor_id: proveedorId,
        periodo,
      },
    },
    update: {
      ordenes_evaluadas: totalOrdenes,
      indice_puntualidad: Number(indicePuntualidad.toFixed(2)),
      indice_cumplimiento_cant: Number(indiceCantidades.toFixed(2)),
      indice_incidencias: Number(indiceIncidencias.toFixed(2)),
      indice_precios: 100.0,
      calificacion_global: Number(calificacionGlobal.toFixed(2)),
      categoria_desempeno: categoriaDesempeno,
      observaciones: `Cálculo automático determinista sobre ${totalOrdenes} orden(es) y ${incidenciasCount} incidencia(s) registradas.`,
    },
    create: {
      empresa_id: empresaId,
      proveedor_id: proveedorId,
      periodo,
      ordenes_evaluadas: totalOrdenes,
      indice_puntualidad: Number(indicePuntualidad.toFixed(2)),
      indice_cumplimiento_cant: Number(indiceCantidades.toFixed(2)),
      indice_incidencias: Number(indiceIncidencias.toFixed(2)),
      indice_precios: 100.0,
      calificacion_global: Number(calificacionGlobal.toFixed(2)),
      categoria_desempeno: categoriaDesempeno,
      observaciones: `Cálculo automático determinista sobre ${totalOrdenes} orden(es) y ${incidenciasCount} incidencia(s) registradas.`,
    },
  });
}

export async function listEvaluaciones(empresaId: string, options?: { proveedorId?: string }) {
  const where: any = { empresa_id: empresaId };
  if (options?.proveedorId) where.proveedor_id = options.proveedorId;

  return await prisma.evaluacionProveedor.findMany({
    where,
    include: {
      proveedor: { select: { id: true, nombre_legal: true, identificador_fiscal: true, clasificacion: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createIncidencia(empresaId: string, userId: string, data: any) {
  const proveedor = await prisma.proveedor.findFirst({
    where: { id: data.proveedorId, empresa_id: empresaId },
  });
  if (!proveedor) throw new NotFoundError('Proveedor no encontrado');

  const incidencia = await prisma.incidenciaProveedor.create({
    data: {
      empresa_id: empresaId,
      proveedor_id: data.proveedorId,
      orden_compra_id: data.ordenCompraId || null,
      recepcion_id: data.recepcionId || null,
      tipo_incidencia: data.tipoIncidencia,
      severidad: data.severidad,
      descripcion: data.descripcion.trim(),
      costo_impacto_estimado: data.costoImpactoEstimado ?? 0,
      resuelta: false,
    },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.CREATE,
    entidad: 'INCIDENCIA_PROVEEDOR',
    entidadId: incidencia.id,
    datosNuevos: { tipo: incidencia.tipo_incidencia, proveedor: proveedor.nombre_legal },
  });

  return incidencia;
}

export async function resolveIncidencia(empresaId: string, incidenciaId: string, userId: string, data: any) {
  const incidencia = await prisma.incidenciaProveedor.findFirst({
    where: { id: incidenciaId, empresa_id: empresaId },
  });
  if (!incidencia) throw new NotFoundError('Incidencia no encontrada');

  const actualizada = await prisma.incidenciaProveedor.update({
    where: { id: incidenciaId },
    data: {
      resuelta: true,
      fecha_resolucion: new Date(),
      solucion_aplicada: data.solucionAplicada.trim(),
    },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.UPDATE,
    entidad: 'INCIDENCIA_PROVEEDOR',
    entidadId: incidenciaId,
    datosNuevos: { resuelta: true, solucion: data.solucionAplicada },
  });

  return actualizada;
}

export async function listIncidencias(empresaId: string, options?: { proveedorId?: string; resuelta?: boolean }) {
  const where: any = { empresa_id: empresaId };
  if (options?.proveedorId) where.proveedor_id = options.proveedorId;
  if (typeof options?.resuelta === 'boolean') where.resuelta = options.resuelta;

  return await prisma.incidenciaProveedor.findMany({
    where,
    include: {
      proveedor: { select: { id: true, nombre_legal: true } },
      orden_compra: { select: { id: true, numero_orden: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
