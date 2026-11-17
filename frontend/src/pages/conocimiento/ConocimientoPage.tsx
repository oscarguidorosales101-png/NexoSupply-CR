import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  FileText,
  ExternalLink,
  Search,
  Filter,
  HardDrive,
  Cpu,
  Layers,
  Folder,
  AlertTriangle,
  RotateCw,
  Key,
  UploadCloud,
  LogOut,
} from 'lucide-react';
import {
  getEstadoConocimiento,
  getCarpetasDrive,
  getDocumentosDrive,
  ejecutarSincronizacionManual,
  reintentarDocumento,
  getHistorialSincronizaciones,
  getOAuthAuthUrl,
  revokeOAuthAccess,
  uploadTestOAuthFile,
  syncOperationalFilesOAuth,
  EstadoConocimiento,
  CarpetaDrive,
  DocumentoDrive,
  SincronizacionDrive,
} from '../../api/conocimiento.api';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { useAuth } from '../../context/AuthContext';

export const ConocimientoPage: React.FC = () => {
  const { activeCompany } = useAuth();
  const [activeTab, setActiveTab] = useState<'DOCUMENTOS' | 'CARPETAS' | 'HISTORIAL'>('DOCUMENTOS');
  const [estado, setEstado] = useState<EstadoConocimiento | null>(null);
  const [carpetas, setCarpetas] = useState<CarpetaDrive[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoDrive[]>([]);
  const [historial, setHistorial] = useState<SincronizacionDrive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [isSyncingOAuthFiles, setIsSyncingOAuthFiles] = useState(false);
  const [isUploadingTest, setIsUploadingTest] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroCarpeta, setFiltroCarpeta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cargarDatos = async () => {
    setIsLoading(true);
    setErrorCarga(null);
    try {
      const [est, carp, docs, hist] = await Promise.all([
        getEstadoConocimiento(),
        getCarpetasDrive(),
        getDocumentosDrive({ estado: filtroEstado, carpetaId: filtroCarpeta || undefined }),
        getHistorialSincronizaciones(),
      ]);
      setEstado(est || null);
      setCarpetas(Array.isArray(carp) ? carp : []);
      setDocumentos(Array.isArray(docs) ? docs : []);
      setHistorial(Array.isArray(hist) ? hist : []);
    } catch (err: any) {
      console.error('Error al cargar datos de conocimiento:', err);
      setErrorCarga(err?.message || 'Error al conectar con el servidor para obtener los datos de conocimiento.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado, filtroCarpeta]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatusParam = params.get('oauth');
    const oauthEmailParam = params.get('email');
    const oauthMsgParam = params.get('message');

    if (oauthStatusParam === 'success') {
      setSyncFeedback({
        tipo: 'exito',
        mensaje: `Google Drive personal (${oauthEmailParam || 'cuenta autorizada'}) conectado exitosamente. Permisos de escritura activados en NexoSupply-Root.`,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthStatusParam === 'error') {
      setSyncFeedback({
        tipo: 'error',
        mensaje: `Error al conectar Google Drive OAuth: ${oauthMsgParam || 'Autorización denegada o fallida'}`,
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleConnectOAuth = async () => {
    setIsConnectingOAuth(true);
    try {
      const res = await getOAuthAuthUrl();
      if (res && res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      setSyncFeedback({
        tipo: 'error',
        mensaje: err.message || 'Error al iniciar conexión OAuth con Google Drive.',
      });
      setIsConnectingOAuth(false);
    }
  };

  const handleRevokeOAuth = async () => {
    if (!window.confirm('¿Está seguro de que desea desconectar y revocar los permisos OAuth de Google Drive?')) {
      return;
    }
    try {
      await revokeOAuthAccess();
      setSyncFeedback({
        tipo: 'exito',
        mensaje: 'Acceso OAuth revocado exitosamente.',
      });
      await cargarDatos();
    } catch (err: any) {
      setSyncFeedback({
        tipo: 'error',
        mensaje: err.message || 'Error al revocar acceso OAuth.',
      });
    }
  };

  const handleUploadTestFile = async () => {
    setIsUploadingTest(true);
    try {
      const res = await uploadTestOAuthFile();
      setSyncFeedback({
        tipo: 'exito',
        mensaje: `Archivo de prueba '${res.nombre}' subido exitosamente a NexoSupply-Root (ID: ${res.driveFileId}). SHA-256: ${res.sha256.substring(0, 16)}...`,
      });
      await cargarDatos();
    } catch (err: any) {
      setSyncFeedback({
        tipo: 'error',
        mensaje: err.message || 'Error al subir archivo de prueba vía OAuth.',
      });
    } finally {
      setIsUploadingTest(false);
    }
  };

  const handleSyncOperationalFiles = async () => {
    setIsSyncingOAuthFiles(true);
    try {
      const res = await syncOperationalFilesOAuth();
      setSyncFeedback({
        tipo: 'exito',
        mensaje: `Sincronización operativa completada: ${res.exitosos} de ${res.total} archivos TXT subidos a Google Drive personal y ${res.documentosIndexadosEnRag || 0} indexados en RAG.`,
      });
      await cargarDatos();
    } catch (err: any) {
      setSyncFeedback({
        tipo: 'error',
        mensaje: err.message || 'Error al subir archivos operativos vía OAuth.',
      });
    } finally {
      setIsSyncingOAuthFiles(false);
    }
  };

  const handleSincronizar = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await ejecutarSincronizacionManual();
      setSyncFeedback({
        tipo: 'exito',
        mensaje: `Sincronización completada con éxito. ${res.documentosProcesados || 0} documentos y ${res.fragmentosGenerados || 0} fragmentos indexados.`,
      });
      await cargarDatos();
    } catch (err: any) {
      setSyncFeedback({
        tipo: 'error',
        mensaje: err.message || 'Error durante la sincronización con Google Drive.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReintentar = async (docId: string) => {
    try {
      await reintentarDocumento(docId);
      await cargarDatos();
    } catch (err: any) {
      alert(`Error al reintentar documento: ${err.message}`);
    }
  };

  const getEstadoBadge = (st: DocumentoDrive['estado_indexacion']) => {
    switch (st) {
      case 'INDEXADO':
        return <Badge variant="success">INDEXADO</Badge>;
      case 'PENDIENTE':
        return <Badge variant="warning">PENDIENTE</Badge>;
      case 'INDEXANDO':
        return <Badge variant="info">INDEXANDO</Badge>;
      case 'REQUIERE_OCR':
        return <Badge variant="neutral">REQUIERE OCR</Badge>;
      case 'ERROR':
        return <Badge variant="danger">ERROR</Badge>;
      default:
        return <Badge variant="neutral">{st}</Badge>;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const listaDocumentos = Array.isArray(documentos) ? documentos : [];
  const listaCarpetas = Array.isArray(carpetas) ? carpetas : [];
  const listaHistorial = Array.isArray(historial) ? historial : [];

  // Filtrado de documentos en memoria por búsqueda de nombre
  const documentosFiltrados = listaDocumentos.filter((d) => {
    if (!busqueda) return true;
    return (d?.nombre || '').toLowerCase().includes(busqueda.toLowerCase());
  });

  const columnsDocs: Column<DocumentoDrive>[] = [
    {
      header: 'Nombre del Documento',
      cell: (d) => (
        <div className="flex items-center space-x-2.5 max-w-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-xs text-slate-900 block truncate" title={d.nombre}>
              {d.nombre}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {d.carpeta?.nombre || 'Raíz'} • {formatFileSize(d.tamanio_bytes)}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Estado de Indexación',
      cell: (d) => (
        <div>
          {getEstadoBadge(d.estado_indexacion)}
          {d.ultimo_error && (
            <span className="block text-[10px] text-rose-600 mt-1 max-w-xs truncate" title={d.ultimo_error}>
              {d.ultimo_error}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Fragmentos (Chunks)',
      cell: (d) => (
        <div className="text-xs">
          <span className="font-bold text-slate-800">{d.total_fragmentos}</span>
          <span className="text-slate-400 ml-1">vectores</span>
        </div>
      ),
    },
    {
      header: 'Última Actualización',
      cell: (d) => (
        <span className="text-xs text-slate-600 font-mono">
          {new Date(d.updatedAt).toLocaleDateString('es-CR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      header: 'Acciones',
      cell: (d) => (
        <div className="flex items-center space-x-2">
          {d.url_web_view && (
            <a
              href={d.url_web_view}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Abrir en Google Drive"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {(d.estado_indexacion === 'ERROR' || d.estado_indexacion === 'REQUIERE_OCR') && (
            <button
              onClick={() => handleReintentar(d.id)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
              title="Reintentar procesamiento"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  const columnsHistorial: Column<SincronizacionDrive>[] = [
    {
      header: 'Fecha y Hora',
      cell: (h) => (
        <span className="text-xs text-slate-800 font-mono font-medium">
          {new Date(h.iniciado_en).toLocaleString('es-CR')}
        </span>
      ),
    },
    {
      header: 'Estado',
      cell: (h) => (
        <Badge variant={h.estado === 'COMPLETADA' ? 'success' : h.estado === 'INICIADA' ? 'info' : 'danger'}>
          {h.estado}
        </Badge>
      ),
    },
    {
      header: 'Archivos Detectados',
      cell: (h) => <span className="text-xs text-slate-700 font-medium">{h.archivos_detectados}</span>,
    },
    {
      header: 'Archivos Procesados',
      cell: (h) => <span className="text-xs text-slate-700 font-medium">{h.archivos_procesados}</span>,
    },
    {
      header: 'Fragmentos Generados',
      cell: (h) => <span className="text-xs text-slate-700 font-bold">{h.fragmentos_generados}</span>,
    },
    {
      header: 'Resultado / Observaciones',
      cell: (h) => (
        <span className="text-xs text-slate-500 max-w-sm block truncate" title={h.mensaje_resultado || ''}>
          {h.mensaje_resultado || 'Proceso finalizado.'}
        </span>
      ),
    },
  ];

  const isDriveConnected = Boolean(estado?.drive?.conectado ?? estado?.drive?.connected);
  const driveAccountEmail =
    estado?.drive?.serviceAccountEmail ||
    estado?.drive?.clientEmail ||
    'nexosupply-cr@nexosupply-cr.iam.gserviceaccount.com';
  const isOAuthConnected = Boolean(estado?.oauth?.conectado);
  const isQdrantActive = Boolean(estado?.vectorStore?.qdrantActivo);

  if (isLoading && !estado) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          Cargando Centro de Conocimiento Documental (RAG)...
        </h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Consultando estados de Google Drive, OAuth 2.0 y base de datos vectorial.
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Error al renderizar el Centro de Conocimiento">
      <div className="space-y-6">
        {/* Encabezado y Acción Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Centro de Conocimiento Documental (RAG)
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Google Drive Cloud
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Gestión, ingesta y vectorización de documentos empresariales para el asistente inteligente.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="primary"
              onClick={handleSincronizar}
              disabled={isSyncing}
              className="flex items-center space-x-2 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar con Google Drive'}</span>
            </Button>
          </div>
        </div>

        {/* Banner de Error al Cargar Datos */}
        {errorCarga && (
          <div className="p-4 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Error de comunicación con el servicio:</span>{' '}
                <span>{errorCarga}</span>
              </div>
            </div>
            <button
              onClick={cargarDatos}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 flex-shrink-0 ml-4"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>
        )}

        {/* Banner de Feedback si hubo sincronización */}
        {syncFeedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
              syncFeedback.tipo === 'exito'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {syncFeedback.tipo === 'exito' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span className="font-medium">{syncFeedback.mensaje}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-slate-600 ml-4 font-bold"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Tarjetas de Conectividad: Google Drive, OAuth 2.0 Personal y Motor Vectorial */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Drive Info (Service Account) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Cuenta de Servicio (Lectura)</h3>
                <span
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isDriveConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isDriveConnected ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span>{isDriveConnected ? 'Conectado' : 'Desconectado'}</span>
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p className="truncate">
                  <span className="text-slate-400 font-medium">Carpeta Raíz:</span>{' '}
                  <span className="font-bold text-slate-800">
                    {estado?.drive?.rootFolderName || 'NexoSupply-Root'}
                  </span>
                </p>
                <p className="truncate">
                  <span className="text-slate-400 font-medium">Cuenta:</span>{' '}
                  <span className="font-mono text-slate-700" title={driveAccountEmail}>
                    {driveAccountEmail}
                  </span>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Proyecto GCP:</span>{' '}
                  <span className="font-mono text-slate-700">{estado?.drive?.projectId || 'nexosupply-cr'}</span>
                </p>
                <div className="pt-2">
                  <a
                    href={estado?.drive?.rootFolderUrl || 'https://drive.google.com/drive/folders/1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver NexoSupply-Root</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* OAuth 2.0 Personal (Escritura en Mi Unidad) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-4">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Key className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">OAuth 2.0 (Escritura Personal)</h3>
                <span
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isOAuthConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOAuthConnected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>{isOAuthConnected ? 'Conectado' : 'Pendiente de Autorización'}</span>
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p className="truncate">
                  <span className="text-slate-400 font-medium">Propietario:</span>{' '}
                  <span className="font-mono text-slate-700 font-semibold" title={estado?.oauth?.emailAutorizado || 'oscarguidorosales101@gmail.com'}>
                    {estado?.oauth?.emailAutorizado || 'oscarguidorosales101@gmail.com'}
                  </span>
                </p>
                <p className="truncate">
                  <span className="text-slate-400 font-medium">Escritura en:</span>{' '}
                  <span className="font-bold text-slate-800">NexoSupply-Root</span>{' '}
                  <span className="text-[11px] text-slate-400">(Mi Unidad)</span>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Token Cifrado:</span>{' '}
                  <span className={isOAuthConnected ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    {isOAuthConnected ? 'AES-256-GCM Activo' : 'Pendiente autorizar'}
                  </span>
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {!isOAuthConnected ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleConnectOAuth}
                      disabled={isConnectingOAuth}
                      className="flex items-center space-x-1.5 text-xs shadow-sm"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{isConnectingOAuth ? 'Conectando...' : 'Conectar Google Drive'}</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncOperationalFiles}
                        disabled={isSyncingOAuthFiles}
                        className="flex items-center space-x-1 text-xs bg-slate-50 hover:bg-slate-100"
                        title="Sube los 15 archivos TXT a NexoSupply-Root"
                      >
                        <UploadCloud className={`w-3.5 h-3.5 ${isSyncingOAuthFiles ? 'animate-spin' : ''}`} />
                        <span>{isSyncingOAuthFiles ? 'Subiendo TXTs...' : 'Subir 15 TXTs'}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleUploadTestFile}
                        disabled={isUploadingTest}
                        className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-800"
                        title="Sube un archivo TXT de prueba"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{isUploadingTest ? '...' : 'Prueba TXT'}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRevokeOAuth}
                        className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        title="Revocar acceso OAuth"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Desconectar</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vector Store Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Motor Vectorial y Embeddings</h3>
                <span
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isQdrantActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isQdrantActive ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>{isQdrantActive ? 'Qdrant Activo' : 'Qdrant Offline'}</span>
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <p className="truncate">
                  <span className="text-slate-400 font-medium">Almacén:</span>{' '}
                  <span className="font-semibold text-slate-800">
                    {estado?.vectorStore?.motor || 'Qdrant Vector Database'}
                  </span>
                </p>
                <p className="truncate">
                  <span className="text-slate-400 font-medium">Embeddings:</span>{' '}
                  <span className="font-mono text-slate-700">
                    {estado?.embeddings?.modelo || 'all-MiniLM-L6-v2'} ({estado?.embeddings?.dimension || 384}d ONNX)
                  </span>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Aislamiento:</span>{' '}
                  <span className="text-emerald-700 font-semibold">Filtro por empresa_id</span>
                </p>
                {!isQdrantActive && (
                  <p className="text-[11px] text-amber-700 pt-1 truncate" title="Qdrant offline en localhost:6333. Modo seguro activo.">
                    Qdrant offline en localhost:6333.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Tarjetas de Métricas Documentales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Documentos
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {estado?.metricas?.totalDocumentos || 0}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">En el repositorio empresarial</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Indexados Exitosamente
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {estado?.metricas?.documentosIndexados || 0}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">Disponibles para el chatbot RAG</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pendientes / OCR
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-600 tracking-tight">
              {(estado?.metricas?.documentosPendientes || 0) + (estado?.metricas?.documentosError || 0)}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">Pendientes o revisión de formato</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Fragmentos Vectoriales
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-indigo-700 tracking-tight">
              {estado?.metricas?.totalFragmentos || 0}
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">Vectores de 384 dimensiones</span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('DOCUMENTOS')}
            className={`py-3 px-1 border-b-2 font-bold text-xs tracking-tight transition-colors flex items-center space-x-2 ${
              activeTab === 'DOCUMENTOS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documentos Indexados ({listaDocumentos.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('CARPETAS')}
            className={`py-3 px-1 border-b-2 font-bold text-xs tracking-tight transition-colors flex items-center space-x-2 ${
              activeTab === 'CARPETAS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Estructura de Carpetas Normadas ({listaCarpetas.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORIAL')}
            className={`py-3 px-1 border-b-2 font-bold text-xs tracking-tight transition-colors flex items-center space-x-2 ${
              activeTab === 'HISTORIAL'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Historial de Sincronizaciones ({listaHistorial.length})</span>
          </button>
        </nav>
      </div>

      {/* Contenido según Pestaña Activa */}
      {activeTab === 'DOCUMENTOS' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre de archivo..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Estado:</span>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="INDEXADO">Indexados</option>
                  <option value="PENDIENTE">Pendientes</option>
                  <option value="REQUIERE_OCR">Requiere OCR</option>
                  <option value="ERROR">Con Error</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                <span>Carpeta:</span>
                <select
                  value={filtroCarpeta}
                  onChange={(e) => setFiltroCarpeta(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 max-w-[200px]"
                >
                  <option value="">Todas las carpetas</option>
                  {listaCarpetas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de Documentos */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <Table
              columns={columnsDocs}
              data={documentosFiltrados}
              isLoading={isLoading}
              emptyMessage="No se encontraron documentos registrados en el repositorio de la empresa."
            />
          </div>
        </div>
      )}

      {activeTab === 'CARPETAS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 mb-1">
                  Estructura Normada Centralizada en Google Drive (NexoSupply-Root):
                </p>
                <p>
                  Jerarquía organizada bajo la carpeta raíz oficial{' '}
                  <span className="font-mono bg-slate-100 px-1 py-0.5 rounded font-semibold text-slate-800">
                    NexoSupply-Root (ID: {estado?.drive?.rootFolderId || '1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1'})
                  </span>
                  . Incluye documentación del proyecto, carpetas operativas de la empresa, manuales de administración y registros de sincronización.
                </p>
              </div>
              <a
                href={estado?.drive?.rootFolderUrl || 'https://drive.google.com/drive/folders/1o9NCjcxLqF0-BHS5jTDFCTs883-zlAh1'}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ml-4"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Raíz en Drive</span>
              </a>
            </div>
          </div>

          {listaCarpetas.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <Folder className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700">Sin carpetas registradas</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No se encontraron carpetas vinculadas a esta empresa. Ejecute la sincronización inicial para crear la estructura normada en Google Drive.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listaCarpetas.map((c) => (
                <div
                  key={c.id}
                  className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate" title={c.nombre}>
                        {c.nombre}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        Categoría: <span className="text-slate-600 font-medium">{c.categoria || 'Operacional'}</span>
                      </p>
                      {c.drive_folder_id && (
                        <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                          ID: {c.drive_folder_id}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500">
                      Documentos: <strong className="text-slate-800 font-bold">{c._count?.documentos || 0}</strong>
                    </span>
                    {c.drive_folder_id && (
                      <a
                        href={`https://drive.google.com/drive/folders/${c.drive_folder_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        title="Abrir esta carpeta en Google Drive"
                      >
                        <span>Ver en Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'HISTORIAL' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <Table
            columns={columnsHistorial}
            data={listaHistorial}
            isLoading={isLoading}
            emptyMessage="No se han registrado ejecuciones de sincronización todavía."
          />
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};

export default ConocimientoPage;
