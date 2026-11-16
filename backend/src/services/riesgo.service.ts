import { prisma } from '../config/database';
import { NotFoundError } from '../errors/app-error';
import { TipoRiesgo, NivelSeveridadAlerta, TipoAccionAuditoria } from '@prisma/client';
import { registrarAuditoria } from './auditoria.service';

export async function listAlertasRiesgo(
  empresaId: string,
  options?: { resuelta?: boolean; nivel?: NivelSeveridadAlerta; estado?: string }
) {
  const where: any = { empresa_id: empresaId };
  if (typeof options?.resuelta === 'boolean') where.resuelta = options.resuelta;
  if (options?.nivel) where.nivel_severidad = options.nivel;
  if (options?.estado && options.estado !== 'TODAS') {
    where.estado = options.estado;
  }

  return await prisma.alertaRiesgo.findMany({
    where,
    include: {
      resuelto_por: {
        select: {
          id: true,
          nombre_completo: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateAlertaEstado(
  empresaId: string,
  alertaId: string,
  userId: string,
  nuevoEstado: 'CRITICO' | 'EN_SEGUIMIENTO' | 'RESUELTO',
  accionResolucion?: string
) {
  const alerta = await prisma.alertaRiesgo.findFirst({
    where: { id: alertaId, empresa_id: empresaId },
  });
  if (!alerta) throw new NotFoundError('Alerta no encontrada');

  const updateData: any = {
    estado: nuevoEstado,
    leida: true,
  };

  if (nuevoEstado === 'RESUELTO') {
    updateData.resuelta = true;
    updateData.resuelto_por_id = userId;
    updateData.fecha_resolucion = new Date();
    updateData.accion_resolucion = accionResolucion || 'Alerta resuelta operativamente por el usuario.';
  } else if (nuevoEstado === 'EN_SEGUIMIENTO') {
    updateData.resuelta = false;
  }

  const updatedAlerta = await prisma.alertaRiesgo.update({
    where: { id: alertaId },
    data: updateData,
    include: {
      resuelto_por: {
        select: {
          id: true,
          nombre_completo: true,
          email: true,
        },
      },
    },
  });

  await registrarAuditoria({
    usuarioId: userId,
    empresaId,
    accion: TipoAccionAuditoria.UPDATE,
    entidad: 'ALERTA_RIESGO_ESTADO',
    entidadId: alertaId,
    datosAnteriores: { estado: alerta.estado, resuelta: alerta.resuelta },
    datosNuevos: { estado: nuevoEstado, accionResolucion },
  });

  return updatedAlerta;
}

export async function markAlertaResolved(
  empresaId: string,
  alertaId: string,
  userId: string,
  accionResolucion?: string
) {
  return await updateAlertaEstado(empresaId, alertaId, userId, 'RESUELTO', accionResolucion);
}

export async function detectOperationalRisks(empresaId: string) {
  const alertasGeneradas: any[] = [];

  // 1. Detección de productos bajo mínimo
  const stocks = await prisma.inventarioStock.findMany({
    where: { empresa_id: empresaId },
    include: { producto: true, almacen: true },
  });

  for (const s of stocks) {
    const actual = Number(s.cantidad_actual);
    const minimo = Number(s.stock_minimo);
    if (minimo > 0 && actual <= minimo) {
      const existing = await prisma.alertaRiesgo.findFirst({
        where: {
          empresa_id: empresaId,
          recurso_id: s.producto_id,
          tipo_riesgo: TipoRiesgo.STOCK_MINIMO,
          resuelta: false,
        },
      });

      if (!existing) {
        const nuevaAlerta = await prisma.alertaRiesgo.create({
          data: {
            empresa_id: empresaId,
            tipo_riesgo: TipoRiesgo.STOCK_MINIMO,
            nivel_severidad: actual === 0 ? NivelSeveridadAlerta.CRITICO : NivelSeveridadAlerta.ADVERTENCIA,
            titulo: `Riesgo de Quiebre de Stock: ${s.producto.nombre}`,
            mensaje: `El stock en ${s.almacen.nombre} es de ${actual} und, inferior al mínimo establecido de ${minimo} und.`,
            recurso_tipo: 'PRODUCTO',
            recurso_id: s.producto_id,
          },
        });
        alertasGeneradas.push(nuevaAlerta);
      }
    }
  }

  return {
    nuevasAlertas: alertasGeneradas.length,
    alertas: alertasGeneradas,
  };
}
