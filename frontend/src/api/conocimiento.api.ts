import { apiClient } from './client';

export interface DriveStatus {
  conectado: boolean;
  serviceAccountEmail?: string;
  projectId?: string;
  tipoCredencial?: string;
  rootFolderConfigurada?: boolean;
  rootFolderId?: string;
  error?: string;
}

export interface VectorStoreInfo {
  motor: string;
  qdrantActivo: boolean;
  coleccion: string;
  filtroEmpresaObligatorio: boolean;
}

export interface EmbeddingsInfo {
  proveedor: string;
  modelo: string;
  dimension: number;
}

export interface MetricasConocimiento {
  totalCarpetas: number;
  totalDocumentos: number;
  documentosIndexados: number;
  documentosPendientes: number;
  documentosError: number;
  totalFragmentos: number;
}

export interface SincronizacionDrive {
  id: string;
  iniciado_en: string;
  finalizado_en?: string;
  estado: 'INICIADA' | 'COMPLETADA' | 'ERROR';
  archivos_detectados: number;
  archivos_procesados: number;
  fragmentos_generados: number;
  mensaje_resultado?: string;
}

export interface EstadoConocimiento {
  drive: DriveStatus;
  vectorStore: VectorStoreInfo;
  embeddings: EmbeddingsInfo;
  metricas: MetricasConocimiento;
  ultimaSincronizacion?: SincronizacionDrive | null;
}

export interface CarpetaDrive {
  id: string;
  empresa_id: string;
  nombre: string;
  drive_folder_id: string;
  categoria?: string;
  _count?: {
    documentos: number;
  };
}

export interface DocumentoDrive {
  id: string;
  empresa_id: string;
  nombre: string;
  mime_type: string;
  tamanio_bytes: number;
  drive_file_id?: string;
  carpeta_id?: string;
  estado_indexacion: 'PENDIENTE' | 'INDEXANDO' | 'INDEXADO' | 'REQUIERE_OCR' | 'ERROR';
  total_fragmentos: number;
  ultimo_error?: string | null;
  url_web_view?: string | null;
  createdAt: string;
  updatedAt: string;
  carpeta?: {
    nombre: string;
    categoria?: string;
  };
}

export async function getEstadoConocimiento(): Promise<EstadoConocimiento> {
  const res = await apiClient<{ success: boolean; data: EstadoConocimiento }>('/conocimiento/estado');
  return res.data;
}

export async function getCarpetasDrive(): Promise<CarpetaDrive[]> {
  const res = await apiClient<{ success: boolean; data: CarpetaDrive[] }>('/conocimiento/carpetas');
  return res.data;
}

export async function getDocumentosDrive(filtros?: {
  estado?: string;
  carpetaId?: string;
}): Promise<DocumentoDrive[]> {
  const params = new URLSearchParams();
  if (filtros?.estado && filtros.estado !== 'TODOS') params.append('estado', filtros.estado);
  if (filtros?.carpetaId) params.append('carpetaId', filtros.carpetaId);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await apiClient<{ success: boolean; data: DocumentoDrive[] }>(`/conocimiento/documentos${query}`);
  return res.data;
}

export async function ejecutarSincronizacionManual(): Promise<any> {
  const res = await apiClient<{ success: boolean; data: any }>('/conocimiento/sincronizar', {
    method: 'POST',
  });
  return res.data;
}

export async function reintentarDocumento(id: string): Promise<any> {
  const res = await apiClient<{ success: boolean; data: any }>(`/conocimiento/documentos/${id}/reintentar`, {
    method: 'POST',
  });
  return res.data;
}

export async function getHistorialSincronizaciones(): Promise<SincronizacionDrive[]> {
  const res = await apiClient<{ success: boolean; data: SincronizacionDrive[] }>('/conocimiento/sincronizaciones');
  return res.data;
}
