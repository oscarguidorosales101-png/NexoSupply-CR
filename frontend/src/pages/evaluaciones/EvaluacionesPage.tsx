import React, { useState, useEffect } from 'react';
import {
  Star,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import {
  listEvaluaciones,
  runEvaluacion,
  listIncidencias,
  createIncidencia,
  resolveIncidencia,
  EvaluacionProveedor,
  IncidenciaProveedor,
} from '../../api/evaluaciones.api';
import { listProveedores, Proveedor } from '../../api/proveedores.api';
import { useAuth } from '../../context/AuthContext';

export const EvaluacionesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'evaluaciones' | 'incidencias'>('evaluaciones');
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionProveedor[]>([]);
  const [incidencias, setIncidencias] = useState<IncidenciaProveedor[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCalcularModalOpen, setIsCalcularModalOpen] = useState(false);
  const [isIncidenciaModalOpen, setIsIncidenciaModalOpen] = useState(false);
  const [isResolverModalOpen, setIsResolverModalOpen] = useState(false);
  const [selectedIncidencia, setSelectedIncidencia] = useState<IncidenciaProveedor | null>(null);

  // Form states
  const [calcForm, setCalcForm] = useState({
    proveedorId: '',
    periodo: '2026-Q1',
  });

  const [incidenciaForm, setIncidenciaForm] = useState({
    proveedorId: '',
    tipoIncidencia: 'ENTREGA_TARDIA',
    severidad: 'MEDIA',
    descripcion: '',
  });

  const [accionCorrectiva, setAccionCorrectiva] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [evals, incs, provs] = await Promise.all([
        listEvaluaciones().catch(() => []),
        listIncidencias().catch(() => []),
        listProveedores().catch(() => []),
      ]);
      setEvaluaciones(evals);
      setIncidencias(incs);
      setProveedores(provs);
      if (provs.length > 0) {
        setCalcForm((prev) => ({ ...prev, proveedorId: provs[0].id }));
        setIncidenciaForm((prev) => ({ ...prev, proveedorId: provs[0].id }));
      }
    } catch (err) {
      console.error('Error al cargar evaluaciones:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCalcular = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await runEvaluacion(calcForm);
      alert('¡Evaluación generada con éxito sobre órdenes y recepciones reales!');
      setIsCalcularModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error al calcular evaluación');
    }
  };

  const handleCreateIncidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createIncidencia(incidenciaForm);
      alert('¡Incidencia registrada con éxito!');
      setIsIncidenciaModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error al registrar incidencia');
    }
  };

  const handleResolveIncidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidencia) return;
    try {
      await resolveIncidencia(selectedIncidencia.id, { accionCorrectiva });
      alert('¡Incidencia marcada como resuelta!');
      setIsResolverModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error al resolver incidencia');
    }
  };

  const getPerformanceBadge = (nivel: string) => {
    switch (nivel?.toUpperCase()) {
      case 'EXCELENTE':
        return <Badge variant="success">Excelente</Badge>;
      case 'BUENO':
        return <Badge variant="primary">Bueno</Badge>;
      case 'REGULAR':
        return <Badge variant="warning">Regular</Badge>;
      default:
        return <Badge variant="danger">Deficiente</Badge>;
    }
  };

  const evaluacionColumns: Column<EvaluacionProveedor>[] = [
    {
      header: 'Proveedor',
      cell: (e) => (
        <div>
          <span className="font-bold text-slate-900 block">{e.proveedor?.nombre_legal || 'Proveedor'}</span>
          <span className="text-xs text-slate-400">ID: {e.proveedor?.identificador_fiscal}</span>
        </div>
      ),
    },
    {
      header: 'Periodo',
      cell: (e) => <span className="font-mono text-xs font-semibold text-slate-700">{e.periodo}</span>,
    },
    {
      header: 'OTD (Tiempos)',
      cell: (e) => (
        <div className="w-32">
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span>OTD</span>
            <span className="text-blue-600">{Number(e.cumplimiento_tiempos_otd)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, Number(e.cumplimiento_tiempos_otd))}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'OFR (Cantidades)',
      cell: (e) => (
        <div className="w-32">
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span>OFR</span>
            <span className="text-emerald-600">{Number(e.cumplimiento_cantidades_ofr)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, Number(e.cumplimiento_cantidades_ofr))}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Calificación Global',
      cell: (e) => (
        <div className="flex items-center space-x-1.5">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="font-black text-slate-900 text-sm">
            {Number(e.calificacion_global).toFixed(1)}
          </span>
          <span className="text-[11px] text-slate-400">/ 100</span>
        </div>
      ),
    },
    {
      header: 'Nivel',
      cell: (e) => getPerformanceBadge(e.nivel_desempeno),
    },
  ];

  const incidenciaColumns: Column<IncidenciaProveedor>[] = [
    {
      header: 'Proveedor',
      cell: (i) => (
        <span className="font-bold text-slate-900 text-xs">{i.proveedor?.nombre_legal || 'Proveedor'}</span>
      ),
    },
    {
      header: 'Tipo de Incidencia',
      cell: (i) => (
        <span className="text-xs font-medium text-slate-700">{i.tipo_incidencia.replace(/_/g, ' ')}</span>
      ),
    },
    {
      header: 'Severidad',
      cell: (i) => {
        switch (i.severidad) {
          case 'CRITICA':
            return <Badge variant="danger">Crítica</Badge>;
          case 'ALTA':
            return <Badge variant="warning">Alta</Badge>;
          case 'MEDIA':
            return <Badge variant="info">Media</Badge>;
          default:
            return <Badge variant="neutral">Baja</Badge>;
        }
      },
    },
    {
      header: 'Descripción',
      cell: (i) => (
        <span className="text-xs text-slate-600 max-w-xs truncate block">{i.descripcion}</span>
      ),
    },
    {
      header: 'Estado',
      cell: (i) => (
        <Badge variant={i.resuelta ? 'success' : 'danger'} size="sm">
          {i.resuelta ? 'Resuelta' : 'Pendiente'}
        </Badge>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (i) =>
        !i.resuelta && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedIncidencia(i);
              setIsResolverModalOpen(true);
            }}
          >
            Resolver
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Evaluación y Desempeño de Proveedores
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Métricas objetivas de cumplimiento (OTD, OFR) y registro de incidencias de calidad
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            onClick={() => setIsIncidenciaModalOpen(true)}
            className="flex items-center"
          >
            <AlertTriangle className="w-4 h-4 mr-1.5" /> Registrar Incidencia
          </Button>

          {hasPermission('REPORTES_GERENCIALES') && (
            <Button onClick={() => setIsCalcularModalOpen(true)} className="flex items-center">
              <Play className="w-4 h-4 mr-1.5" /> Calcular Desempeño
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('evaluaciones')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'evaluaciones'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Scorecards de Evaluación ({evaluaciones.length})
        </button>
        <button
          onClick={() => setActiveTab('incidencias')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'incidencias'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Control de Incidencias ({incidencias.length})
        </button>
      </div>

      {activeTab === 'evaluaciones' ? (
        <Table columns={evaluacionColumns} data={evaluaciones} isLoading={isLoading} />
      ) : (
        <Table columns={incidenciaColumns} data={incidencias} isLoading={isLoading} />
      )}

      {/* Modal Calcular Evaluación */}
      <Modal
        isOpen={isCalcularModalOpen}
        onClose={() => setIsCalcularModalOpen(false)}
        title="Ejecutar Cálculo de Desempeño"
        subtitle="Analiza todas las órdenes completadas y tiempos reales de recepción."
      >
        <form onSubmit={handleCalcular} className="space-y-4">
          <Select
            label="Proveedor a Evaluar"
            required
            value={calcForm.proveedorId}
            onChange={(e) => setCalcForm({ ...calcForm, proveedorId: e.target.value })}
            options={proveedores.map((p) => ({ value: p.id, label: p.nombre_legal }))}
          />

          <Input
            label="Periodo de Evaluación"
            required
            value={calcForm.periodo}
            onChange={(e) => setCalcForm({ ...calcForm, periodo: e.target.value })}
            placeholder="Ej. 2026-Q1 o 2026-ANUAL"
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCalcularModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Ejecutar Evaluación</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Registrar Incidencia */}
      <Modal
        isOpen={isIncidenciaModalOpen}
        onClose={() => setIsIncidenciaModalOpen(false)}
        title="Registrar Incidencia de Proveedor"
        subtitle="Impactará en el índice de calidad y calificación final del proveedor."
      >
        <form onSubmit={handleCreateIncidencia} className="space-y-4">
          <Select
            label="Proveedor Responsable"
            required
            value={incidenciaForm.proveedorId}
            onChange={(e) => setIncidenciaForm({ ...incidenciaForm, proveedorId: e.target.value })}
            options={proveedores.map((p) => ({ value: p.id, label: p.nombre_legal }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tipo de Falla"
              value={incidenciaForm.tipoIncidencia}
              onChange={(e) => setIncidenciaForm({ ...incidenciaForm, tipoIncidencia: e.target.value })}
              options={[
                { value: 'ENTREGA_TARDIA', label: 'Entrega Tardía' },
                { value: 'CANTIDAD_INCOMPLETA', label: 'Cantidad Incompleta' },
                { value: 'PRODUCTO_DEFECTUOSO', label: 'Producto Defectuoso' },
                { value: 'DISCREPANCIA_PRECIO', label: 'Discrepancia en Factura' },
                { value: 'OTRO', label: 'Otro' },
              ]}
            />
            <Select
              label="Nivel de Severidad"
              value={incidenciaForm.severidad}
              onChange={(e) => setIncidenciaForm({ ...incidenciaForm, severidad: e.target.value })}
              options={[
                { value: 'BAJA', label: 'Baja' },
                { value: 'MEDIA', label: 'Media' },
                { value: 'ALTA', label: 'Alta' },
                { value: 'CRITICA', label: 'Crítica' },
              ]}
            />
          </div>

          <Input
            label="Detalle de los Hechos"
            required
            value={incidenciaForm.descripcion}
            onChange={(e) => setIncidenciaForm({ ...incidenciaForm, descripcion: e.target.value })}
            placeholder="Lote llegó con 3 días de retraso sin previo aviso..."
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsIncidenciaModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Incidencia</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Resolver Incidencia */}
      <Modal
        isOpen={isResolverModalOpen}
        onClose={() => setIsResolverModalOpen(false)}
        title="Resolver Incidencia"
        subtitle="Registra la acción correctiva acordada con el proveedor."
      >
        <form onSubmit={handleResolveIncidencia} className="space-y-4">
          <Input
            label="Acción Correctiva o Compromiso del Proveedor"
            required
            value={accionCorrectiva}
            onChange={(e) => setAccionCorrectiva(e.target.value)}
            placeholder="El proveedor envió nota de crédito y sustitución de lote..."
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsResolverModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Marcar como Resuelta</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
