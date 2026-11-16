import { apiClient } from './client';

export interface DashboardKPIs {
  kpis: {
    totalProveedores: number;
    totalProductos: number;
    ordenesActivas: number;
    solicitudesPendientes: number;
    productosBajoMinimo: number;
    valorTotalInventario: number;
    promedioDesempenoProveedores: number;
    alertasPendientes: number;
  };
  ordenesRecientes: Array<{
    id: string;
    numeroOrden: string;
    proveedor: string;
    total: number;
    moneda: string;
    estado: string;
    fechaPrometida: string;
  }>;
  topProveedores: Array<{
    proveedorId: string;
    nombre: string;
    clasificacion: string;
    montoTotal: number;
  }>;
}

export interface RegistroAuditoria {
  id: string;
  usuario_id: string;
  accion: string;
  entidad: string;
  entidad_id?: string;
  ip_address?: string;
  user_agent?: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  createdAt: string;
  usuario?: {
    id: string;
    nombre_completo: string;
    email: string;
  };
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  return await apiClient<DashboardKPIs>('/reportes/dashboard');
}

export async function listAuditorias(limit = 50): Promise<RegistroAuditoria[]> {
  return await apiClient<RegistroAuditoria[]>(`/reportes/auditoria?limit=${limit}`);
}
