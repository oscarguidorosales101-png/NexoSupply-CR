import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Play,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Boxes,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {
  listSimulaciones,
  runSimulacion,
  SimulacionContinuidad,
  ProductoAfectadoSimulacion,
} from '../../api/simulaciones.api';
import { listProveedores, Proveedor } from '../../api/proveedores.api';
import { useAuth } from '../../context/AuthContext';

export const SimulacionesPage: React.FC = () => {
  const { hasPermission, activeCompany } = useAuth();
  const [simulaciones, setSimulaciones] = useState<SimulacionContinuidad[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [activeSimulacion, setActiveSimulacion] = useState<SimulacionContinuidad | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    nombreEscenario: 'Simulación de Contingencia en Cadena',
    descripcion: 'Análisis de impacto ante disrupción operativa del proveedor clave.',
    proveedorAfectadoId: '',
    diasRetrasoSimulados: 14,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sims, provs] = await Promise.all([
        listSimulaciones().catch(() => []),
        listProveedores().catch(() => []),
      ]);
      setSimulaciones(sims);
      setProveedores(provs);
      if (sims.length > 0 && !activeSimulacion) {
        setActiveSimulacion(sims[0]);
      }
      if (provs.length > 0 && !formData.proveedorAfectadoId) {
        setFormData((prev) => ({ ...prev, proveedorAfectadoId: provs[0].id }));
      }
    } catch (err) {
      console.error('Error al cargar simulaciones:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    try {
      const result = await runSimulacion({
        ...formData,
        diasRetrasoSimulados: Number(formData.diasRetrasoSimulados),
      });
      setActiveSimulacion(result);
      setSimulaciones([result, ...simulaciones]);
      alert('¡Simulación What-If calculada con éxito sin alterar inventario real!');
    } catch (err: any) {
      alert(err?.message || 'Error al ejecutar simulación');
    } finally {
      setIsRunning(false);
    }
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: activeCompany?.monedaBase || 'CRC',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const productoColumns: Column<ProductoAfectadoSimulacion>[] = [
    {
      header: 'Producto SKU',
      cell: (p) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{p.nombre}</span>
          <span className="text-[11px] text-blue-600 font-mono">{p.sku}</span>
        </div>
      ),
    },
    {
      header: 'Stock Actual',
      cell: (p) => <span className="font-bold text-xs text-slate-800">{p.stockActual} un.</span>,
    },
    {
      header: 'Consumo Proyectado/Día',
      cell: (p) => <span className="text-xs text-slate-600">{p.consumoDiarioEstimado.toFixed(1)} un/día</span>,
    },
    {
      header: 'Cobertura',
      cell: (p) => (
        <span className={`text-xs font-bold ${p.sufreQuiebre ? 'text-rose-600' : 'text-emerald-600'}`}>
          {p.diasCobertura} días
        </span>
      ),
    },
    {
      header: 'Riesgo de Quiebre',
      cell: (p) => (
        <Badge variant={p.sufreQuiebre ? 'danger' : 'success'} size="sm">
          {p.sufreQuiebre ? `Déficit de ${p.diasDeficit} días` : 'Cobertura suficiente'}
        </Badge>
      ),
    },
    {
      header: 'Alternativo / Sobrecosto',
      cell: (p) => (
        <div className="text-xs">
          {p.tieneAlternativo ? (
            <span className="text-slate-900 font-semibold block">
              Sobrecosto: {formatCurrency(p.sobrecostoEstimado)}
            </span>
          ) : (
            <span className="text-rose-600 font-medium">Sin alternativa activa</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Simulador de Continuidad de Negocio (What-If)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Modelado de contingencias operativas, estimación de días de cobertura y costo de proveedores alternos
          </p>
        </div>
      </div>

      {/* Simulator Form Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
          Configurar Escenario de Disrupción
        </h2>

        <form onSubmit={handleRunSimulation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Nombre del Escenario"
              required
              value={formData.nombreEscenario}
              onChange={(e) => setFormData({ ...formData, nombreEscenario: e.target.value })}
              placeholder="Ej. Huelga aduanera en Puerto Caldera"
            />

            <Select
              label="Proveedor Afectado"
              required
              value={formData.proveedorAfectadoId}
              onChange={(e) => setFormData({ ...formData, proveedorAfectadoId: e.target.value })}
              options={proveedores.map((p) => ({ value: p.id, label: p.nombre_legal }))}
            />

            <Input
              label="Días de Retraso Simulados"
              type="number"
              min="1"
              max="180"
              required
              value={formData.diasRetrasoSimulados}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  diasRetrasoSimulados: parseInt(e.target.value, 10) || 1,
                })
              }
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isRunning} className="flex items-center">
              <Play className="w-4 h-4 mr-1.5" /> Ejecutar Análisis What-If
            </Button>
          </div>
        </form>
      </div>

      {/* Simulation Results Display */}
      {activeSimulacion && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                Escenario Activo
              </span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">
                {activeSimulacion.nombre_escenario}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">
                Proveedor: {activeSimulacion.proveedor_afectado?.nombre_legal}
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                Impacto en Cobertura
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-black text-rose-600">
                  {activeSimulacion.impacto_quiebre_stock_estimado_dias} días
                </span>
                <span className="text-xs text-slate-400">hasta primer quiebre</span>
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Retraso simulado: {activeSimulacion.dias_retraso_simulados} días
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">
                Sobrecosto Total de Mitigación
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {formatCurrency(Number(activeSimulacion.sobrecosto_estimado))}
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                Con proveedores alternos registrados
              </span>
            </div>
          </div>

          {/* Table of Impacted Products */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              Impacto por Producto y Alternativas de Abastecimiento
            </h3>
            <Table
              columns={productoColumns}
              data={activeSimulacion.productos_afectados_json || []}
              isLoading={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};
