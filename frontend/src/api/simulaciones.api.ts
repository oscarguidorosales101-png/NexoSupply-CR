import { apiClient } from './client';

export interface ProductoAfectadoSimulacion {
  productoId: string;
  sku: string;
  nombre: string;
  stockActual: number;
  consumoDiarioEstimado: number;
  diasCobertura: number;
  sufreQuiebre: boolean;
  diasDeficit: number;
  sobrecostoEstimado: number;
  tieneAlternativo: boolean;
}

export interface ProveedorAlternoSimulacion {
  productoId: string;
  productoNombre: string;
  proveedorAlternoId: string;
  proveedorAlternoNombre: string;
  precioAcordado: number;
  diasEntrega: number;
}

export interface SimulacionContinuidad {
  id: string;
  nombre_escenario: string;
  descripcion?: string;
  proveedor_afectado_id: string;
  dias_retraso_simulados: number;
  impacto_quiebre_stock_estimado_dias: number;
  sobrecosto_estimado: number;
  productos_afectados_json: ProductoAfectadoSimulacion[];
  proveedores_alternos_json: ProveedorAlternoSimulacion[];
  parametros_json: any;
  createdAt: string;
  proveedor_afectado?: {
    id: string;
    nombre_legal: string;
  };
  creado_por?: {
    id: string;
    nombre_completo: string;
  };
}

export async function listSimulaciones(): Promise<SimulacionContinuidad[]> {
  return await apiClient<SimulacionContinuidad[]>('/simulaciones');
}

export async function runSimulacion(data: {
  nombreEscenario: string;
  descripcion?: string;
  proveedorAfectadoId: string;
  diasRetrasoSimulados: number;
}): Promise<SimulacionContinuidad> {
  return await apiClient<SimulacionContinuidad>('/simulaciones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
