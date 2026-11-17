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
} from 'lucide-react';
import {
  getEstadoConocimiento,
  getCarpetasDrive,
  getDocumentosDrive,
  ejecutarSincronizacionManual,
  reintentarDocumento,
  getHistorialSincronizaciones,
  EstadoConocimiento,
  CarpetaDrive,
  DocumentoDrive,
  SincronizacionDrive,
} from '../../api/conocimiento.api';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { useAuth } from '../../context/AuthContext';

export const ConocimientoPage: React.FC = () => {
  const { activeCompany } = useAuth();
  const [activeTab, setActiveTab] = useState<'DOCUMENTOS' | 'CARPETAS' | 'HISTORIAL'>('DOCUMENTOS');
  const [estado, setEstado] = useState<EstadoConocimiento | null>(null);
  const [carpetas, setCarpetas] = useState<CarpetaDrive[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoDrive[]>([]);
  const [historial, setHistorial] = useState<SincronizacionDrive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroCarpeta, setFiltroCarpeta] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [est, carp, docs, hist] = await Promise.all([
        getEstadoConocimiento(),
        getCarpetasDrive(),
        getDocumentosDrive({ estado: filtroEstado, carpetaId: filtroCarpeta || undefined }),
        getHistorialSincronizaciones(),
      ]);
      setEstado(est);
      setCarpetas(carp);
      setDocumentos(docs);
      setHistorial(hist);
    } catch (err) {
      console.error('Error al cargar datos de conocimiento:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado, filtroCarpeta]);

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

  // Filtrado de documentos en memoria por búsqueda de nombre
  const documentosFiltrados = documentos.filter((d) => {
    if (!busqueda) return true;
    return d.nombre.toLowerCase().includes(busqueda.toLowerCase());
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

  return (
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

      {/* Tarjeta de Conectividad con Google Drive y Motor Vectorial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Drive Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Conexión con Google Drive API</h3>
              <span
                className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  estado?.drive?.conectado
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    estado?.drive?.conectado ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span>{estado?.drive?.conectado ? 'Conectado' : 'Desconectado'}</span>
              </span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <p className="truncate">
                <span className="text-slate-400 font-medium">Cuenta de Servicio:</span>{' '}
                <span className="font-mono text-slate-700">
                  {estado?.drive?.serviceAccountEmail || 'nexosupply-cr@nexosupply-cr.iam.gserviceaccount.com'}
                </span>
              </p>
              <p>
                <span className="text-slate-400 font-medium">Proyecto Google Cloud:</span>{' '}
                <span className="font-mono text-slate-700">{estado?.drive?.projectId || 'nexosupply-cr'}</span>
              </p>
              <p>
                <span className="text-slate-400 font-medium">Tipo de Credencial:</span>{' '}
                <span className="text-slate-700">Service Account RSA (JSON Oficial)</span>
              </p>
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
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                Aislamiento Multi-tenant
              </span>
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <p className="truncate">
                <span className="text-slate-400 font-medium">Almacén Vectorial:</span>{' '}
                <span className="font-semibold text-slate-800">
                  {estado?.vectorStore?.motor || 'Motor Vectorial Local en Memoria/MySQL'}
                </span>
              </p>
              <p>
                <span className="text-slate-400 font-medium">Modelo de Embeddings:</span>{' '}
                <span className="font-mono text-slate-700">
                  {estado?.embeddings?.modelo || 'local-semantic-384'} ({estado?.embeddings?.dimension || 384}-dim)
                </span>
              </p>
              <p>
                <span className="text-slate-400 font-medium">Filtro Obligatorio:</span>{' '}
                <span className="text-emerald-700 font-semibold">empresa_id estricto en cada búsqueda</span>
              </p>
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
            <span>Documentos Indexados ({documentos.length})</span>
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
            <span>Estructura de Carpetas Normadas ({carpetas.length})</span>
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
            <span>Historial de Sincronizaciones ({historial.length})</span>
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
                  {carpetas.map((c) => (
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
            <p className="font-semibold text-slate-800 mb-1">
              Estructura Normada de 10 Carpetas por Empresa en Google Drive:
            </p>
            <p>
              Cada inquilino dispone de su propio árbol independiente bajo{' '}
              <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                NexoSupply-Knowledge / Empresa-{activeCompany?.rfcCedula || 'PAC'}
              </span>
              . Los documentos depositados en estas carpetas son analizados e indexados automáticamente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {carpetas.map((c) => (
              <div
                key={c.id}
                className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-300 transition-all flex items-start space-x-3"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Folder className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate" title={c.nombre}>
                    {c.nombre}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Categoría: <span className="text-slate-600">{c.categoria || 'Operacional'}</span>
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500">Documentos:</span>
                    <span className="font-bold text-slate-800">{c._count?.documentos || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'HISTORIAL' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <Table
            columns={columnsHistorial}
            data={historial}
            isLoading={isLoading}
            emptyMessage="No se han registrado ejecuciones de sincronización todavía."
          />
        </div>
      )}
    </div>
  );
};

export default ConocimientoPage;
