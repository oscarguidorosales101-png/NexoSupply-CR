import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Boxes,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  PackageCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { getDashboardKPIs, DashboardKPIs } from '../../api/reportes.api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user, activeCompany } = useAuth();
  const [data, setData] = useState<DashboardKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardKPIs()
      .then((res) => setData(res))
      .catch((err) => console.error('Error al cargar KPIs del dashboard:', err))
      .finally(() => setIsLoading(false));
  }, [activeCompany]);

  // Datos para gráfico de Compras Mensuales (Presupuesto vs Real)
  const comprasMensualesData = [
    { mes: 'Ene', compras: 9.2, presupuesto: 10.5 },
    { mes: 'Feb', compras: 11.4, presupuesto: 12.8 },
    { mes: 'Mar', compras: 13.1, presupuesto: 14.2 },
    { mes: 'Abr', compras: 16.5, presupuesto: 17.0 },
    { mes: 'May', compras: 14.2, presupuesto: 15.5 },
    { mes: 'Jun', compras: 12.0, presupuesto: 13.2 },
  ];

  // Datos para el gráfico de Nivel de Inventario (Donut)
  const inventarioDistribucion = [
    { name: 'Óptimo', value: 87, color: '#10B981' },
    { name: 'Bajo Mínimo', value: 8, color: '#F59E0B' },
    { name: 'Sin Stock', value: 5, color: '#EF4444' },
  ];

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '₡0';
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: activeCompany?.monedaBase || 'CRC',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'COMPLETADA':
        return <Badge variant="success">Completada</Badge>;
      case 'EN_TRANSITO':
      case 'EMITIDA':
        return <Badge variant="primary">En Proceso</Badge>;
      case 'PARCIALMENTE_RECIBIDA':
        return <Badge variant="info">Recepción Parcial</Badge>;
      case 'PENDIENTE':
      case 'BORRADOR':
        return <Badge variant="warning">Pendiente</Badge>;
      default:
        return <Badge variant="neutral">{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Panel ejecutivo</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Resumen general de tu operación en{' '}
            <span className="font-semibold text-slate-700">
              {activeCompany?.razonSocial || 'NexoSupply CR'}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-medium text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Últimos 30 días</span>
          </div>
          <button
            onClick={() => navigate('/reportes')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Ver reportes →
          </button>
        </div>
      </div>

      {/* 4 Key StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Órdenes de Compra"
          value={data?.kpis.ordenesActivas ?? 24}
          change="↑ +12%"
          trend="up"
          comparisonText="vs. mes anterior"
          icon={ShoppingCart}
          iconColor="blue"
          sparklineVariant="up"
        />

        <StatCard
          title="Valor de Inventario"
          value={formatCurrency(data?.kpis.valorTotalInventario ?? 12450000)}
          change="↑ +5%"
          trend="up"
          comparisonText="vs. mes anterior"
          icon={Boxes}
          iconColor="emerald"
          sparklineVariant="up"
        />

        <StatCard
          title="Proveedores Activos"
          value={data?.kpis.totalProveedores ?? 24}
          change="→ 0%"
          trend="neutral"
          comparisonText="vs. mes anterior"
          icon={Users}
          iconColor="purple"
          sparklineVariant="neutral"
        />

        <StatCard
          title="Alertas de Riesgo"
          value={data?.kpis.alertasPendientes ?? 3}
          change="↓ -25%"
          trend="down"
          comparisonText="vs. mes anterior"
          icon={AlertTriangle}
          iconColor="amber"
          sparklineVariant="down"
        />
      </div>

      {/* Middle Row: Compras por mes & Nivel de Inventario */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Compras por Mes Chart */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Compras por mes</h3>
              <p className="text-xs text-slate-400">Comparativa de volumen facturado vs presupuesto proyectado</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-[#142742]" />
                <span className="text-slate-600 font-medium">Compras</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-600 font-medium">Presupuesto</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comprasMensualesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="mes" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} unit="M" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="compras" fill="#142742" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Line
                  type="monotone"
                  dataKey="presupuesto"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10B981' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estado de Inventario Donut Chart */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900">Nivel de inventario</h3>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                {data?.kpis.productosBajoMinimo === 0 ? 'Normal' : `${data?.kpis.productosBajoMinimo || 2} Críticos`}
              </span>
            </div>
            <p className="text-xs text-slate-400">Distribución de existencias respecto a puntos mínimos</p>
          </div>

          <div className="relative h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inventarioDistribucion}
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {inventarioDistribucion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800">87%</span>
              <span className="text-[11px] font-medium text-slate-400">Nivel Óptimo</span>
            </div>
          </div>

          {/* Legend items */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-50 text-center">
            {inventarioDistribucion.map((item) => (
              <div key={item.name} className="px-2 py-1 bg-slate-50/70 rounded-lg">
                <div className="flex items-center justify-center space-x-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-slate-500 font-medium truncate">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Actividad Reciente & Alertas que requieren atención */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Actividad Reciente */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Actividad reciente</h3>
            </div>
            <button
              onClick={() => navigate('/inventario')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center"
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-50 mt-3">
            <div className="py-2.5 flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Recepción de compra #REC-2025-001</p>
                  <p className="text-[11px] text-slate-400">Se recibieron 120 de 200 unidades · Almacén Central</p>
                </div>
              </div>
              <Badge variant="info" size="sm">Inventario</Badge>
            </div>

            <div className="py-2.5 flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Nueva orden de compra #OC-2025-045</p>
                  <p className="text-[11px] text-slate-400">Proveedor: SumiMed CR · Monto: ₡850,000</p>
                </div>
              </div>
              <Badge variant="success" size="sm">Compras</Badge>
            </div>

            <div className="py-2.5 flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Evaluación de proveedor actualizada</p>
                  <p className="text-[11px] text-slate-400">SumiMed CR · OTD: 98% · Score: 96.50</p>
                </div>
              </div>
              <Badge variant="primary" size="sm">Evaluación</Badge>
            </div>

            <div className="py-2.5 flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">Alerta de stock bajo</p>
                  <p className="text-[11px] text-slate-400">Producto: Guantes Nitrilo (Quedan 45 un.)</p>
                </div>
              </div>
              <Badge variant="warning" size="sm">Riesgo</Badge>
            </div>
          </div>
        </div>

        {/* Alertas que requieren atención / Proveedores Top */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900">Alertas que requieren atención</h3>
            </div>
            <button
              onClick={() => navigate('/riesgos')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center"
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="space-y-3 mt-3">
            <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 flex items-center justify-between">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Stock bajo en Guantes de Nitrilo</p>
                  <p className="text-[11px] text-slate-500">Solo quedan 45 unidades (Mínimo requerido: 100)</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="danger" size="sm">Crítica</Badge>
                <button
                  onClick={() => navigate('/inventario')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Ver detalle
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/40 flex items-center justify-between">
              <div className="flex items-start space-x-2.5">
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Proveedor con retraso</p>
                  <p className="text-[11px] text-slate-500">DisCaribe · 3 días de retraso en entrega esperada</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="warning" size="sm">Media</Badge>
                <button
                  onClick={() => navigate('/compras')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Ver detalle
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-sky-100 bg-sky-50/40 flex items-center justify-between">
              <div className="flex items-start space-x-2.5">
                <FileText className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Orden pendiente de aprobación</p>
                  <p className="text-[11px] text-slate-500">OC-2025-0873 · Monto: ₡850,000</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="info" size="sm">Info</Badge>
                <button
                  onClick={() => navigate('/compras')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Ver detalle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
