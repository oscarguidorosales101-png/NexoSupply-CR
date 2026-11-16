import { TipoAccionAuditoria } from '@prisma/client';
import { prisma } from '../config/database';

export interface RegistrarAuditoriaParams {
  empresaId?: string;
  usuarioId: string;
  accion: TipoAccionAuditoria;
  entidad: string;
  entidadId: string;
  datosAnteriores?: unknown;
  datosNuevos?: unknown;
  ipOrigen?: string;
  userAgent?: string;
}

export async function registrarAuditoria(params: RegistrarAuditoriaParams): Promise<void> {
  try {
    await prisma.registroAuditoria.create({
      data: {
        empresa_id: params.empresaId,
        usuario_id: params.usuarioId,
        accion: params.accion,
        entidad: params.entidad,
        entidad_id: params.entidadId,
        datos_anteriores_json: (params.datosAnteriores as any) ?? undefined,
        datos_nuevos_json: (params.datosNuevos as any) ?? undefined,
        ip_origen: params.ipOrigen,
        user_agent: params.userAgent,
      },
    });
  } catch (error) {
    // La auditoría no debe abortar la transacción principal si ocurre un error secundario de log
    console.error('[AUDITORIA_ERROR] No se pudo guardar el registro de auditoría:', error);
  }
}
