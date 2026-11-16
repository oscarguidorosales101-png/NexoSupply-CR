import { apiClient } from './client';

export interface Producto {
  id: string;
  sku: string;
  codigo_barras?: string;
  nombre: string;
  descripcion?: string;
  categoria?: { id: string; nombre: string };
  unidad_medida: { id: string; nombre: string; simbolo: string };
  costo_promedio: number;
  precio_referencia: number;
  stock_minimo_global: number;
  stock_seguridad: number;
  activo: boolean;
  inventario_stock: any[];
  productos_proveedores?: any[];
}

export async function listProductos(options?: {
  categoriaId?: string;
  search?: string;
  bajoMinimo?: boolean;
}): Promise<Producto[]> {
  const params = new URLSearchParams();
  if (options?.categoriaId) params.append('categoriaId', options.categoriaId);
  if (options?.search) params.append('search', options.search);
  if (options?.bajoMinimo) params.append('bajoMinimo', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiClient<Producto[]>(`/productos${query}`);
}

export async function getProducto(id: string): Promise<Producto> {
  return await apiClient<Producto>(`/productos/${id}`);
}

export async function createProducto(data: any): Promise<Producto> {
  return await apiClient<Producto>('/productos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProducto(id: string, data: any): Promise<Producto> {
  return await apiClient<Producto>(`/productos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function linkProductoProveedor(productoId: string, data: any): Promise<any> {
  return await apiClient(`/productos/${productoId}/proveedores`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listCategorias(): Promise<any[]> {
  return await apiClient('/productos/categorias');
}

export async function createCategoria(data: any): Promise<any> {
  return await apiClient('/productos/categorias', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listUnidadesMedida(): Promise<any[]> {
  return await apiClient('/productos/unidades-medida');
}

export async function createUnidadMedida(data: any): Promise<any> {
  return await apiClient('/productos/unidades-medida', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
