import { apiClient } from './client';

export interface InventarioStock {
  id: string;
  almacen_id: string;
  producto_id: string;
  cantidad_actual: number;
  cantidad_reservada: number;
  stock_minimo: number;
  ubicacion_pasillo?: string;
  almacen: { id: string; codigo: string; nombre: string };
  producto: {
    id: string;
    sku: string;
    nombre: string;
    costo_promedio: number;
    unidad_medida: { simbolo: string };
    categoria?: { nombre: string };
  };
}

export interface KardexMovement {
  id: string;
  tipo_movimiento: string;
  cantidad: number;
  costo_unitario: number;
  stock_anterior: number;
  stock_posterior: number;
  referencia_tipo: string;
  referencia_id?: string;
  motivo: string;
  createdAt: string;
  producto: { sku: string; nombre: string };
  almacen: { codigo: string; nombre: string };
  usuario: { nombre_completo: string; email: string };
}

export async function getStock(options?: { almacenId?: string; bajoMinimo?: boolean }): Promise<InventarioStock[]> {
  const params = new URLSearchParams();
  if (options?.almacenId) params.append('almacenId', options.almacenId);
  if (options?.bajoMinimo) params.append('bajoMinimo', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiClient<InventarioStock[]>(`/inventario/stock${query}`);
}

export async function getKardex(options?: {
  productoId?: string;
  almacenId?: string;
  limit?: number;
}): Promise<KardexMovement[]> {
  const params = new URLSearchParams();
  if (options?.productoId) params.append('productoId', options.productoId);
  if (options?.almacenId) params.append('almacenId', options.almacenId);
  if (options?.limit) params.append('limit', String(options.limit));
  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiClient<KardexMovement[]>(`/inventario/kardex${query}`);
}

export async function adjustStock(data: {
  almacenId: string;
  productoId: string;
  tipoMovimiento: 'ENTRADA_AJUSTE' | 'SALIDA_AJUSTE';
  cantidad: number;
  motivo: string;
}): Promise<any> {
  return await apiClient('/inventario/ajustes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listAlmacenes(): Promise<any[]> {
  return await apiClient('/inventario/almacenes');
}

export async function createAlmacen(data: any): Promise<any> {
  return await apiClient('/inventario/almacenes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listRecepciones(options?: { ordenId?: string }): Promise<any[]> {
  const query = options?.ordenId ? `?ordenId=${options.ordenId}` : '';
  return await apiClient<any[]>(`/inventario/recepciones${query}`);
}

export async function createRecepcion(data: any): Promise<any> {
  return await apiClient('/inventario/recepciones', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
