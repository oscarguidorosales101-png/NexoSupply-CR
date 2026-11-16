import { apiClient } from './client';

export interface SolicitudCompra {
  id: string;
  numero_solicitud: string;
  fecha_solicitud: string;
  justificacion: string;
  estado: 'BORRADOR' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CONVERTIDA_EN_ORDEN' | 'CANCELADA';
  moneda: 'CRC' | 'USD';
  total_estimado: number;
  solicitante: { id: string; nombre_completo: string; email: string };
  detalles: any[];
  aprobaciones?: any[];
  orden_generada?: { id: string; numero_orden: string; estado: string };
}

export interface OrdenCompra {
  id: string;
  numero_orden: string;
  fecha_emision: string;
  fecha_prometida_entrega: string;
  estado: 'BORRADOR' | 'EMITIDA' | 'EN_TRANSITO' | 'PARCIALMENTE_RECIBIDA' | 'COMPLETADA' | 'CANCELADA';
  moneda: 'CRC' | 'USD';
  subtotal: number;
  impuestos: number;
  total: number;
  proveedor: { id: string; nombre_legal: string; identificador_fiscal: string };
  almacen_destino: { id: string; codigo: string; nombre: string };
  detalles: any[];
  recepciones?: any[];
}

export async function listSolicitudes(estado?: string): Promise<SolicitudCompra[]> {
  const query = estado ? `?estado=${estado}` : '';
  return await apiClient<SolicitudCompra[]>(`/compras/solicitudes${query}`);
}

export async function getSolicitud(id: string): Promise<SolicitudCompra> {
  return await apiClient<SolicitudCompra>(`/compras/solicitudes/${id}`);
}

export async function createSolicitud(data: any): Promise<SolicitudCompra> {
  return await apiClient<SolicitudCompra>('/compras/solicitudes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function decideAprobacion(
  solicitudId: string,
  decision: 'APROBADA' | 'RECHAZADA',
  comentario?: string
): Promise<any> {
  return await apiClient(`/compras/solicitudes/${solicitudId}/aprobar`, {
    method: 'POST',
    body: JSON.stringify({ decision, comentario }),
  });
}

export async function listOrdenes(options?: { estado?: string; proveedorId?: string }): Promise<OrdenCompra[]> {
  const params = new URLSearchParams();
  if (options?.estado) params.append('estado', options.estado);
  if (options?.proveedorId) params.append('proveedorId', options.proveedorId);
  const query = params.toString() ? `?${params.toString()}` : '';
  return await apiClient<OrdenCompra[]>(`/compras/ordenes${query}`);
}

export async function getOrden(id: string): Promise<OrdenCompra> {
  return await apiClient<OrdenCompra>(`/compras/ordenes/${id}`);
}

export async function createOrdenFromSolicitud(solicitudId: string, data: any): Promise<OrdenCompra> {
  return await apiClient<OrdenCompra>(`/compras/solicitudes/${solicitudId}/generar-orden`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createOrdenDirecta(data: any): Promise<OrdenCompra> {
  return await apiClient<OrdenCompra>('/compras/ordenes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
