import { apiClient } from './client';

export interface DriveStatus {
  conectado?: boolean;
  connected?: boolean;
  serviceAccountEmail?: string;
  clientEmail?: string;
  projectId?: string;
  tipoCredencial?: string;
  rootFolderConfigurada?: boolean;
  rootFolderId?: string;
  rootFolderName?: string;
  rootFolderUrl?: string;
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

export interface OAuthStatus {
  conectado: boolean;
  emailAutorizado?: string;
  expiraEn?: string | null;
  raizAutorizada: string;
  permisosEscritura: boolean;
  mensaje: string;
}

export interface EstadoConocimiento {
  drive: DriveStatus;
  oauth?: OAuthStatus;
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
  tipo_mime?: string;
  mime_type?: string;
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
  const res = await apiClient<any>('/conocimiento/estado');
  return (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
}

export async function getCarpetasDrive(): Promise<CarpetaDrive[]> {
  const res = await apiClient<any>('/conocimiento/carpetas');
  const list = (res && typeof res === 'object' && 'data' in res && Array.isArray(res.data)) ? res.data : res;
  return Array.isArray(list) ? list : [];
}

export async function getDocumentosDrive(filtros?: {
  estado?: string;
  carpetaId?: string;
}): Promise<DocumentoDrive[]> {
  const params = new URLSearchParams();
  if (filtros?.estado && filtros.estado !== 'TODOS') params.append('estado', filtros.estado);
  if (filtros?.carpetaId) params.append('carpetaId', filtros.carpetaId);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await apiClient<any>(`/conocimiento/documentos${query}`);
  const list = (res && typeof res === 'object' && 'data' in res && Array.isArray(res.data)) ? res.data : res;
  return Array.isArray(list) ? list : [];
}

export async function ejecutarSincronizacionManual(): Promise<any> {
  const res = await apiClient<any>('/conocimiento/sincronizar', {
    method: 'POST',
  });
  return (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
}

export async function reintentarDocumento(id: string): Promise<any> {
  const res = await apiClient<any>(`/conocimiento/documentos/${id}/reintentar`, {
    method: 'POST',
  });
  return (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
}

export async function getHistorialSincronizaciones(): Promise<SincronizacionDrive[]> {
  const res = await apiClient<any>('/conocimiento/sincronizaciones');
  const list = (res && typeof res === 'object' && 'data' in res && Array.isArray(res.data)) ? res.data : res;
  return Array.isArray(list) ? list : [];
}

export async function getOAuthStatus(): Promise<OAuthStatus> {
  const res = await apiClient<any>('/conocimiento/oauth/status');
  return (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
}

export async function getOAuthAuthUrl(): Promise<{ url: string; state: string }> {
  const res = await apiClient<any>('/conocimiento/oauth/auth-url');
  return (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
}

export async function revokeOAuthAccess(): Promise<any> {
  const res = await apiClient<any>('/conocimiento/oauth/revoke', {
    method: 'POST',
  });
  return (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
}

export async function uploadTestOAuthFile(): Promise<any> {
  const res = await apiClient<any>('/conocimiento/oauth/upload-test', {
    method: 'POST',
  });
  return (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
}

export async function syncOperationalFilesOAuth(): Promise<any> {
  const res = await apiClient<any>('/conocimiento/oauth/sync-operational-files', {
    method: 'POST',
  });
  return (res && typeof res === 'object' && 'data' in res && res.data) ? res.data : res;
}
