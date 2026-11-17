import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Clock,
  Eye,
  Check,
  UserCheck,
  FileText,
  Filter,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  listAlertas,
  updateAlertaEstado,
  runRiskScan,
  AlertaRiesgo,
} from '../../api/riesgos.api';
import { useAuth } from '../../context/AuthContext';

export const RiesgosPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [alertas, setAlertas] = useState<AlertaRiesgo[]>([]);
  const [activeTab, setActiveTab] = useState<'TODAS' | 'CRITICO' | 'EN_SEGUIMIENTO' | 'RESUELTO'>('TODAS');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal para Resolver Alerta
  const [resolvingAlerta, setResolvingAlerta] = useState<AlertaRiesgo | null>(null);
  const [accionResolucion, setAccionResolucion] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  const loadAlertas = async () => {
    setIsLoading(true);
    try {
      const data = await listAlertas({ estado: activeTab });
      setAlertas(data);
    } catch (err) {
      console.error('Error al cargar alertas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlertas();
  }, [activeTab]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const res = await runRiskScan();
      alert(`¡Escaneo completado! Nuevas alertas generadas: ${res.nuevasAlertas || res.alertasGeneradas || 0}`);
      loadAlertas();
    } catch (err: any) {
      alert(err?.message || 'Error al ejecutar escaneo');
    } finally {
      setIsScanning(false);
    }
  };

  const handleUpdateStatus = async (
    id: string,
    estado: 'CRITICO' | 'EN_SEGUIMIENTO' | 'RESUELTO',
    accion?: string
  ) => {
    try {
      await updateAlertaEstado(id, estado, accion);
      loadAlertas();
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar estado de alerta');
    }
  };

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlerta) return;
    setIsSubmittingResolution(true);
    try {
      await updateAlertaEstado(resolvingAlerta.id, 'RESUELTO', accionResolucion);
      setResolvingAlerta(null);
      setAccionResolucion('');
      loadAlertas();
    } catch (err: any) {
      alert(err?.message || 'Error al resolver la alerta');
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const getSeverityBadge = (s: string) => {
    switch (s) {
      case 'CRITICA':
      case 'CRITICO':
        return <Badge variant="danger">Crítica</Badge>;
      case 'ALTA':
      case 'ADVERTENCIA':
        return <Badge variant="warning">Advertencia</Badge>;
      case 'MEDIA':
        return <Badge variant="info">Media</Badge>;
      default:
        return <Badge variant="neutral">Informativo</Badge>;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'CRITICO':
        return <Badge variant="danger" size="sm">Crítico</Badge>;
      case 'EN_SEGUIMIENTO':
        return <Badge variant="warning" size="sm">En Seguimiento</Badge>;
      case 'RESUELTO':
        return <Badge variant="success" size="sm">Resuelto</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{estado}</Badge>;
    }
  };

  const columns: Column<AlertaRiesgo>[] = [
    {
      header: 'Alerta / Detalle',
      cell: (a) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{a.titulo}</div>
          <div className="text-[11px] text-slate-500 max-w-sm mt-0.5">{a.mensaje}</div>
          {a.accion_resolucion && (
            <div className="mt-1.5 p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-800">
              <span className="font-semibold">Acción tomada:</span> {a.accion_resolucion}
              {a.resuelto_por && (
                <span className="text-emerald-700 block mt-0.5">
                  Por: {a.resuelto_por.nombre_completo} (
                  {a.fecha_resolucion ? new Date(a.fecha_resolucion).toLocaleDateString() : ''})
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Severidad',
      cell: (a) => getSeverityBadge(a.nivel_severidad),
    },
    {
      header: 'Tipo Riesgo',
      cell: (a) => (
        <span className="text-xs font-mono text-slate-600">
          {a.tipo_riesgo || a.tipo_alerta || a.recurso_tipo || 'OPERATIVO'}
        </span>
      ),
    },
    {
      header: 'Fecha',
      cell: (a) => (
        <span className="text-xs text-slate-500">
          {new Date(a.createdAt).toLocaleString('es-CR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      header: 'Ciclo de Vida',
      cell: (a) => getEstadoBadge(a.estado || (a.resuelta ? 'RESUELTO' : 'CRITICO')),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (a) => {
        const est = a.estado || (a.resuelta ? 'RESUELTO' : 'CRITICO');
        if (est === 'RESUELTO') {
          return (
            <span className="text-xs text-emerald-600 font-medium inline-flex items-center">
              <Check className="w-3.5 h-3.5 mr-1" /> Completado
            </span>
          );
        }

        return (
          <div className="flex items-center justify-end space-x-1.5">
            {est === 'CRITICO' && (
              <button
                onClick={() =>
                  handleUpdateStatus(a.id, 'EN_SEGUIMIENTO', 'Puesta en seguimiento preventivo.')
                }
                className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-medium transition-colors"
                title="Monitorear alerta"
              >
                Seguimiento
              </button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setResolvingAlerta(a);
                setAccionResolucion('');
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Resolver
            </Button>
          </div>
        );
      },
    },
  ];

  // Métricas rápidas
  const totalCriticas = alertas.filter((a) => a.estado === 'CRITICO' || (!a.estado && !a.resuelta)).length;
  const totalSeguimiento = alertas.filter((a) => a.estado === 'EN_SEGUIMIENTO').length;
  const totalResueltas = alertas.filter((a) => a.estado === 'RESUELTO' || a.resuelta).length;

  return (
    <div className="space-y-6">
      {/* Page Title & Scan Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Gestión de Alertas y Riesgos Operativos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ciclo de vida completo de mitigación: Crítico → En Seguimiento → Resuelto
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {hasPermission('REPORTES_GERENCIALES') && (
            <Button onClick={handleScan} isLoading={isScanning} className="flex items-center">
              <RefreshCw className="w-4 h-4 mr-1.5" /> Escanear Riesgos
            </Button>
          )}
        </div>
      </div>

      {/* Tabs de Filtro por Ciclo de Vida */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('TODAS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'TODAS'
              ? 'bg-[#0B192C] text-white shadow'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todas las Alertas ({alertas.length})
        </button>
        <button
          onClick={() => setActiveTab('CRITICO')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
            activeTab === 'CRITICO'
              ? 'bg-rose-600 text-white shadow'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Críticas ({totalCriticas})</span>
        </button>
        <button
          onClick={() => setActiveTab('EN_SEGUIMIENTO')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
            activeTab === 'EN_SEGUIMIENTO'
              ? 'bg-amber-600 text-white shadow'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>En Seguimiento ({totalSeguimiento})</span>
        </button>
        <button
          onClick={() => setActiveTab('RESUELTO')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
            activeTab === 'RESUELTO'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Resueltas ({totalResueltas})</span>
        </button>
      </div>

      {/* Tabla de Alertas */}
      <Table columns={columns} data={alertas} isLoading={isLoading} />

      {/* Modal para Resolver Alerta */}
      <Modal
        isOpen={!!resolvingAlerta}
        onClose={() => setResolvingAlerta(null)}
        title="Resolver Alerta de Riesgo"
        subtitle={`Registrar la acción correctiva tomada para: ${resolvingAlerta?.titulo || ''}`}
      >
        <form onSubmit={handleSubmitResolution} className="space-y-4 mt-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold block text-slate-800">Descripción del problema:</span>
            {resolvingAlerta?.mensaje}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Acción Correctiva / Medida Adoptada *
            </label>
            <textarea
              required
              rows={3}
              value={accionResolucion}
              onChange={(e) => setAccionResolucion(e.target.value)}
              placeholder="Ejemplo: Se emitió orden de compra de emergencia al proveedor alternativo con entrega en 24 horas."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResolvingAlerta(null)}
              disabled={isSubmittingResolution}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmittingResolution}>
              Confirmar Resolución
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
