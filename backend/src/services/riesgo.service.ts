import { prisma } from '../config/database';
import { NotFoundError } from '../errors/app-error';
import { TipoRiesgo, NivelSeveridadAlerta } from '@prisma/client';

export async function listAlertasRiesgo(
  empresaId: string,
  options?: { resuelta?: boolean; nivel?: NivelSeveridadAlerta }
) {
  const where: any = { empresa_id: empresaId };
  if (typeof options?.resuelta === 'boolean') where.resuelta = options.resuelta;
  if (options?.nivel) where.nivel_severidad = options.nivel;

  return await prisma.alertaRiesgo.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function markAlertaResolved(empresaId: string, alertaId: string) {
  const alerta = await prisma.alertaRiesgo.findFirst({
    where: { id: alertaId, empresa_id: empresaId },
  });
  if (!alerta) throw new NotFoundError('Alerta no encontrada');

  return await prisma.alertaRiesgo.update({
    where: { id: alertaId },
    data: { resuelta: true, leida: true },
  });
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
