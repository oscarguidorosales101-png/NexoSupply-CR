import { apiClient } from './client';

export interface AlertaRiesgo {
  id: string;
  empresa_id?: string;
  tipo_riesgo?: string;
  tipo_alerta?: string;
  nivel_severidad: 'INFORMATIVO' | 'ADVERTENCIA' | 'CRITICO' | 'BAJA' | 'MEDIA' | 'ALTA';
  titulo: string;
  mensaje: string;
  recurso_tipo?: string;
  recurso_id?: string;
  entidad_afectada_tipo?: string;
  entidad_afectada_id?: string;
  leida?: boolean;
  resuelta: boolean;
  estado: 'CRITICO' | 'EN_SEGUIMIENTO' | 'RESUELTO';
  resuelto_por_id?: string | null;
  resuelto_por?: {
    id: string;
    nombre_completo: string;
    email: string;
  } | null;
  fecha_resolucion?: string | null;
  accion_resolucion?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface RiskScanResult {
  scanTimestamp?: string;
  alertasGeneradas?: number;
  nuevasAlertas?: number;
  alertas: any[];
}

export async function listAlertas(options?: {
  resuelta?: boolean;
  nivel?: string;
  estado?: string;
}): Promise<AlertaRiesgo[]> {
  const params = new URLSearchParams();
  if (typeof options?.resuelta === 'boolean') params.append('resuelta', String(options.resuelta));
  if (options?.nivel) params.append('nivel', options.nivel);
  if (options?.estado && options.estado !== 'TODAS') params.append('estado', options.estado);
  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiClient<AlertaRiesgo[]>(`/riesgos/alertas${query}`);
}

export async function resolveAlerta(id: string, accionResolucion?: string): Promise<AlertaRiesgo> {
  return await apiClient<AlertaRiesgo>(`/riesgos/alertas/${id}/resolver`, {
    method: 'PATCH',
    body: JSON.stringify({ accionResolucion }),
  });
}

export async function updateAlertaEstado(
  id: string,
  estado: 'CRITICO' | 'EN_SEGUIMIENTO' | 'RESUELTO',
  accionResolucion?: string
): Promise<AlertaRiesgo> {
  return await apiClient<AlertaRiesgo>(`/riesgos/alertas/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado, accionResolucion }),
  });
}

export async function runRiskScan(): Promise<RiskScanResult> {
  return await apiClient<RiskScanResult>('/riesgos/escanear', {
    method: 'POST',
  });
}
