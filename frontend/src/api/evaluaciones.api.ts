import { apiClient } from './client';

export interface EvaluacionProveedor {
  id: string;
  proveedor_id: string;
  periodo: string;
  cumplimiento_tiempos_otd: number;
  cumplimiento_cantidades_ofr: number;
  tasa_incidencias: number;
  calificacion_global: number;
  nivel_desempeno: string;
  createdAt: string;
  proveedor?: {
    id: string;
    nombre_legal: string;
    identificador_fiscal: string;
    clasificacion: string;
  };
}

export interface IncidenciaProveedor {
  id: string;
  proveedor_id: string;
  orden_compra_id?: string;
  tipo_incidencia: 'ENTREGA_TARDIA' | 'CANTIDAD_INCOMPLETA' | 'PRODUCTO_DEFECTUOSO' | 'DISCREPANCIA_PRECIO' | 'OTRO';
  severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  descripcion: string;
  resuelta: boolean;
  accion_correctiva?: string;
  fecha_resolucion?: string;
  createdAt: string;
  proveedor?: {
    id: string;
    nombre_legal: string;
  };
  orden_compra?: {
    id: string;
    numero_orden: string;
  };
}

export async function listEvaluaciones(options?: { proveedorId?: string }): Promise<EvaluacionProveedor[]> {
  const query = options?.proveedorId ? `?proveedorId=${options.proveedorId}` : '';
  return await apiClient<EvaluacionProveedor[]>(`/evaluaciones${query}`);
}

export async function runEvaluacion(data: {
  proveedorId: string;
  periodo: string;
}): Promise<EvaluacionProveedor> {
  return await apiClient<EvaluacionProveedor>('/evaluaciones/calcular', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listIncidencias(options?: {
  proveedorId?: string;
  resuelta?: boolean;
}): Promise<IncidenciaProveedor[]> {
  const params = new URLSearchParams();
  if (options?.proveedorId) params.append('proveedorId', options.proveedorId);
  if (typeof options?.resuelta === 'boolean') params.append('resuelta', String(options.resuelta));
  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiClient<IncidenciaProveedor[]>(`/evaluaciones/incidencias${query}`);
}

export async function createIncidencia(data: {
  proveedorId: string;
  ordenCompraId?: string;
  tipoIncidencia: string;
  severidad: string;
  descripcion: string;
}): Promise<IncidenciaProveedor> {
  return await apiClient<IncidenciaProveedor>('/evaluaciones/incidencias', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resolveIncidencia(
  id: string,
  data: { accionCorrectiva: string }
): Promise<IncidenciaProveedor> {
  return await apiClient<IncidenciaProveedor>(`/evaluaciones/incidencias/${id}/resolver`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
