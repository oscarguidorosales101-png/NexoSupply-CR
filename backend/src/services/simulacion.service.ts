import { prisma } from '../config/database';
import { NotFoundError, BadRequestError } from '../errors/app-error';
import { registrarAuditoria } from './auditoria.service';
import { TipoAccionAuditoria } from '@prisma/client';

export async function runContinuidadSimulation(
  empresaId: string,
  userId: string,
  data: {
    nombreEscenario: string;
    descripcion?: string;
    proveedorAfectadoId: string;
    diasRetrasoSimulados: number;
  }
) {
  const proveedor = await prisma.proveedor.findFirst({
    where: { id: data.proveedorAfectadoId, empresa_id: empresaId },
    include: {
      productos_proveedores: {
        include: {
          producto: {
            include: {
              inventario_stock: true,
              productos_proveedores: {
                include: { proveedor: true },
              },
            },
          },
        },
      },
    },
  });

  if (!proveedor) {
    throw new NotFoundError('Proveedor crítico afectado no encontrado');
  }

  const productosAfectados: any[] = [];
  const proveedoresAlternos: any[] = [];
  let sobrecostoTotalEstimado = 0;
  let menorDiasCobertura = 999;

  for (const pp of proveedor.productos_proveedores) {
    const prod = pp.producto;
    const stockActual = prod.inventario_stock.reduce(
      (sum, s) => sum + Number(s.cantidad_actual),
      0
    );

    // Calcular consumo diario estimado (simulación basada en movimientos o estándar del 5% del stock de seguridad)
    const consumoDiarioEstimado = Math.max(1, Number(prod.stock_seguridad) / 10);
    const diasCobertura = Math.floor(stockActual / consumoDiarioEstimado);

    if (diasCobertura < menorDiasCobertura) {
      menorDiasCobertura = diasCobertura;
    }

    const sufreQuiebre = diasCobertura < data.diasRetrasoSimulados;

    // Buscar proveedores alternativos para este producto (distintos del afectado)
    const alternativos = prod.productos_proveedores.filter(
      (rel) => rel.proveedor_id !== proveedor.id && rel.proveedor.activo
    );

    let alternoSeleccionado = null;
    let sobrecostoProducto = 0;

    if (alternativos.length > 0) {
      alternoSeleccionado = alternativos[0];
      const precioAfectado = Number(pp.precio_unitario_acordado);
      const precioAlterno = Number(alternoSeleccionado.precio_unitario_acordado);
      const diferencia = Math.max(0, precioAlterno - precioAfectado);

      // Sobrecosto para reponer el consumo proyectado durante el retraso
      const unidadesAReponer = consumoDiarioEstimado * (data.diasRetrasoSimulados - diasCobertura);
      if (unidadesAReponer > 0) {
        sobrecostoProducto = unidadesAReponer * diferencia;
        sobrecostoTotalEstimado += sobrecostoProducto;
      }

      proveedoresAlternos.push({
        productoId: prod.id,
        productoNombre: prod.nombre,
        proveedorAlternoId: alternoSeleccionado.proveedor.id,
        proveedorAlternoNombre: alternoSeleccionado.proveedor.nombre_legal,
        precioAcordado: precioAlterno,
        diasEntrega: alternoSeleccionado.dias_entrega_esperados,
      });
    }

    productosAfectados.push({
      productoId: prod.id,
      sku: prod.sku,
      nombre: prod.nombre,
      stockActual,
      consumoDiarioEstimado,
      diasCobertura,
      sufreQuiebre,
      diasDeficit: sufreQuiebre ? data.diasRetrasoSimulados - diasCobertura : 0,
      sobrecostoEstimado: sobrecostoProducto,
      tieneAlternativo: alternativos.length > 0,
    });
  }

  // RN-14: Las simulaciones se guardan exclusivamente en simulaciones_continuidad
  // sin alterar inventario_stock, movimientos_inventario ni ordenes_compra
  const simulacion = await prisma.simulacionContinuidad.create({
    data: {
      empresa_id: empresaId,
      creado_por_id: userId,
      nombre_escenario: data.nombreEscenario.trim(),
      descripcion: data.descripcion?.trim() || null,
      proveedor_afectado_id: proveedor.id,
      dias_retraso_simulados: data.diasRetrasoSimulados,
      parametros_json: {
        diasRetraso: data.diasRetrasoSimulados,
        proveedorNombre: proveedor.nombre_legal,
      },
      productos_afectados_json: productosAfectados,
      impacto_quiebre_stock_estimado_dias: menorDiasCobertura === 999 ? 0 : menorDiasCobertura,
      proveedores_alternos_json: proveedoresAlternos,
      sobrecosto_estimado: sobrecostoTotalEstimado,
    },
    include: {
      proveedor_afectado: { select: { id: true, nombre_legal: true } },
    },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.CREATE,
    entidad: 'SIMULACION_CONTINUIDAD',
    entidadId: simulacion.id,
    datosNuevos: {
      escenario: simulacion.nombre_escenario,
      sobrecosto: simulacion.sobrecosto_estimado,
    },
  });

  return simulacion;
}

export async function listSimulaciones(empresaId: string) {
  return await prisma.simulacionContinuidad.findMany({
    where: { empresa_id: empresaId },
    include: {
      proveedor_afectado: { select: { id: true, nombre_legal: true } },
      creado_por: { select: { id: true, nombre_completo: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
