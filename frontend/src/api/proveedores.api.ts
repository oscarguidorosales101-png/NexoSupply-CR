import { apiClient } from './client';

export interface Proveedor {
  id: string;
  identificador_fiscal: string;
  nombre_legal: string;
  nombre_fantasia?: string;
  clasificacion: 'A' | 'B' | 'C';
  terminos_pago_dias: number;
  moneda_preferida: 'CRC' | 'USD';
  lead_time_promedio_dias: number;
  email?: string;
  telefono?: string;
  direccion?: string;
  activo: boolean;
  contactos?: any[];
  _count?: {
    ordenes_compra: number;
    incidencias: number;
  };
}

export async function listProveedores(options?: { activo?: boolean; search?: string }): Promise<Proveedor[]> {
  const params = new URLSearchParams();
  if (typeof options?.activo === 'boolean') params.append('activo', String(options.activo));
  if (options?.search) params.append('search', options.search);
  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiClient<Proveedor[]>(`/proveedores${query}`);
}

export async function getProveedor(id: string): Promise<Proveedor> {
  return await apiClient<Proveedor>(`/proveedores/${id}`);
}

export async function createProveedor(data: any): Promise<Proveedor> {
  return await apiClient<Proveedor>('/proveedores', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProveedor(id: string, data: any): Promise<Proveedor> {
  return await apiClient<Proveedor>(`/proveedores/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function addContactoProveedor(proveedorId: string, data: any): Promise<any> {
  return await apiClient(`/proveedores/${proveedorId}/contactos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
