import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  ShieldCheck,
  Download,
  Calendar,
  Clock,
  User,
  Activity,
  Layers,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { listAuditorias, RegistroAuditoria } from '../../api/reportes.api';
import { useAuth } from '../../context/AuthContext';

export const ReportesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [auditorias, setAuditorias] = useState<RegistroAuditoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listAuditorias(100)
      .then((res) => setAuditorias(res))
      .catch((err) => console.error('Error al cargar auditoría:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const getActionBadge = (accion: string) => {
    switch (accion) {
      case 'CREATE':
        return <Badge variant="success">CREATE</Badge>;
      case 'UPDATE':
        return <Badge variant="primary">UPDATE</Badge>;
      case 'DELETE':
        return <Badge variant="danger">DELETE</Badge>;
      case 'LOGIN':
        return <Badge variant="info">LOGIN</Badge>;
      default:
        return <Badge variant="neutral">{accion}</Badge>;
    }
  };

  const columns: Column<RegistroAuditoria>[] = [
    {
      header: 'Fecha / Hora',
      cell: (a) => (
        <span className="font-mono text-xs text-slate-600">
          {new Date(a.createdAt).toLocaleString('es-CR')}
        </span>
      ),
    },
    {
      header: 'Usuario',
      cell: (a) => (
        <div className="text-xs">
          <span className="font-bold text-slate-800 block">
            {a.usuario?.nombre_completo || 'Sistema'}
          </span>
          <span className="text-slate-400">{a.usuario?.email}</span>
        </div>
      ),
    },
    {
      header: 'Acción',
      cell: (a) => getActionBadge(a.accion),
    },
    {
      header: 'Entidad Afectada',
      cell: (a) => (
        <div>
          <span className="font-bold text-xs text-slate-800 block">{a.entidad}</span>
          {a.entidad_id && <span className="text-[11px] font-mono text-slate-400">{a.entidad_id}</span>}
        </div>
      ),
    },
    {
      header: 'Detalle de Cambios',
      cell: (a) => (
        <pre className="text-[11px] font-mono text-slate-600 max-w-xs truncate bg-slate-50 p-1 rounded">
          {JSON.stringify(a.datos_nuevos || a.datos_anteriores || {})}
        </pre>
      ),
    },
    {
      header: 'IP Origen',
      cell: (a) => (
        <span className="text-xs font-mono text-slate-500">{a.ip_address || '127.0.0.1'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reportes y Trazabilidad Empresarial
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pistas de auditoría inmutables, cumplimiento normativo y control de cambios en la plataforma
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => alert('Exportando informe de trazabilidad en CSV...')}
          className="flex items-center"
        >
          <Download className="w-4 h-4 mr-1.5" /> Exportar Auditoría
        </Button>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Registro Histórico de Auditoría (Últimas 100 operaciones)
          </h3>
          <span className="text-xs text-slate-400 font-medium">Inalterable conforme a ISO 27001</span>
        </div>

        <Table columns={columns} data={auditorias} isLoading={isLoading} />
      </div>
    </div>
  );
};
