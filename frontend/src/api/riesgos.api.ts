import { apiClient } from './client';

export interface AlertaRiesgo {
  id: string;
  tipo_alerta: string;
  nivel_severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  titulo: string;
  mensaje: string;
  entidad_afectada_tipo?: string;
  entidad_afectada_id?: string;
  resuelta: boolean;
  fecha_resolucion?: string;
  createdAt: string;
}

export interface RiskScanResult {
  scanTimestamp: string;
  alertasGeneradas: number;
  alertas: any[];
}

export async function listAlertas(options?: {
  resuelta?: boolean;
  nivel?: string;
}): Promise<AlertaRiesgo[]> {
  const params = new URLSearchParams();
  if (typeof options?.resuelta === 'boolean') params.append('resuelta', String(options.resuelta));
  if (options?.nivel) params.append('nivel', options.nivel);
  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiClient<AlertaRiesgo[]>(`/riesgos/alertas${query}`);
}

export async function resolveAlerta(id: string): Promise<AlertaRiesgo> {
  return await apiClient<AlertaRiesgo>(`/riesgos/alertas/${id}/resolver`, {
    method: 'PATCH',
  });
}

export async function runRiskScan(): Promise<RiskScanResult> {
  return await apiClient<RiskScanResult>('/riesgos/escanear', {
    method: 'POST',
  });
}
