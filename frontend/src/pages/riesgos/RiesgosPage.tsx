import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { listAlertas, resolveAlerta, runRiskScan, AlertaRiesgo } from '../../api/riesgos.api';
import { useAuth } from '../../context/AuthContext';

export const RiesgosPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [alertas, setAlertas] = useState<AlertaRiesgo[]>([]);
  const [filterResueltas, setFilterResueltas] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAlertas = async () => {
    setIsLoading(true);
    try {
      const data = await listAlertas({ resuelta: filterResueltas ? undefined : false });
      setAlertas(data);
    } catch (err) {
      console.error('Error al cargar alertas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlertas();
  }, [filterResueltas]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const res = await runRiskScan();
      alert(`¡Escaneo completado! Se detectaron y actualizaron ${res.alertasGeneradas} alertas.`);
      loadAlertas();
    } catch (err: any) {
      alert(err?.message || 'Error al ejecutar escaneo');
    } finally {
      setIsScanning(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveAlerta(id);
      loadAlertas();
    } catch (err: any) {
      alert(err?.message || 'Error al resolver alerta');
    }
  };

  const getSeverityBadge = (s: string) => {
    switch (s) {
      case 'CRITICA':
        return <Badge variant="danger">Crítica</Badge>;
      case 'ALTA':
        return <Badge variant="warning">Alta</Badge>;
      case 'MEDIA':
        return <Badge variant="info">Media</Badge>;
      default:
        return <Badge variant="neutral">Baja</Badge>;
    }
  };

  const columns: Column<AlertaRiesgo>[] = [
    {
      header: 'Alerta / Título',
      cell: (a) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{a.titulo}</div>
          <div className="text-[11px] text-slate-500 max-w-md">{a.mensaje}</div>
        </div>
      ),
    },
    {
      header: 'Severidad',
      cell: (a) => getSeverityBadge(a.nivel_severidad),
    },
    {
      header: 'Tipo de Alerta',
      cell: (a) => (
        <span className="text-xs font-mono text-slate-600">{a.tipo_alerta}</span>
      ),
    },
    {
      header: 'Fecha Detección',
      cell: (a) => (
        <span className="text-xs text-slate-500">
          {new Date(a.createdAt).toLocaleString('es-CR')}
        </span>
      ),
    },
    {
      header: 'Estado',
      cell: (a) => (
        <Badge variant={a.resuelta ? 'success' : 'danger'} size="sm">
          {a.resuelta ? 'Resuelta' : 'Activa'}
        </Badge>
      ),
    },
    {
      header: 'Acción',
      className: 'text-right',
      cell: (a) =>
        !a.resuelta && (
          <Button size="sm" variant="outline" onClick={() => handleResolve(a.id)}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Resolver
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Gestión y Monitoreo de Riesgos Operativos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Detección automatizada de quiebres de inventario, retrasos de proveedores y concentración
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setFilterResueltas(!filterResueltas)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors ${
              filterResueltas
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {filterResueltas ? 'Viendo Todas' : 'Solo Activas'}
          </button>

          {hasPermission('REPORTES_GERENCIALES') && (
            <Button onClick={handleScan} isLoading={isScanning} className="flex items-center">
              <RefreshCw className="w-4 h-4 mr-1.5" /> Escanear Riesgos
            </Button>
          )}
        </div>
      </div>

      <Table columns={columns} data={alertas} isLoading={isLoading} />
    </div>
  );
};
