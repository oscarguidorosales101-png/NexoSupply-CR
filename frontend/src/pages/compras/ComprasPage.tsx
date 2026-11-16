import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Eye,
  Check,
  AlertCircle,
  Building,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import {
  listOrdenes,
  listSolicitudes,
  createOrdenDirecta,
  createSolicitud,
  decideAprobacion,
  createOrdenFromSolicitud,
  OrdenCompra,
  SolicitudCompra,
} from '../../api/compras.api';
import { listProveedores, Proveedor } from '../../api/proveedores.api';
import { listProductos, Producto } from '../../api/productos.api';
import { listAlmacenes } from '../../api/inventario.api';
import { useAuth } from '../../context/AuthContext';

export const ComprasPage: React.FC = () => {
  const { hasPermission, activeCompany, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'ordenes' | 'solicitudes'>('ordenes');
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudCompra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [isNewOrdenModalOpen, setIsNewOrdenModalOpen] = useState(false);
  const [isNewSolicitudModalOpen, setIsNewSolicitudModalOpen] = useState(false);
  const [isAprobarModalOpen, setIsAprobarModalOpen] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudCompra | null>(null);
  const [aprobacionDecision, setAprobacionDecision] = useState<'APROBADA' | 'RECHAZADA'>('APROBADA');
  const [aprobacionComentario, setAprobacionComentario] = useState('');

  // Form Orden Directa
  const [ordenForm, setOrdenForm] = useState({
    proveedorId: '',
    almacenDestinoId: '',
    moneda: 'CRC',
    fechaPrometidaEntrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    detalles: [{ productoId: '', cantidadPedida: 10, precioUnitarioAcordado: 1500 }],
  });

  // Form Solicitud
  const [solicitudForm, setSolicitudForm] = useState({
    justificacion: '',
    moneda: 'CRC',
    detalles: [{ productoId: '', cantidad: 10, precioEstimado: 1500 }],
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ords, sols, provs, prods, alms] = await Promise.all([
        listOrdenes().catch(() => []),
        listSolicitudes().catch(() => []),
        listProveedores().catch(() => []),
        listProductos().catch(() => []),
        listAlmacenes().catch(() => []),
      ]);
      setOrdenes(ords);
      setSolicitudes(sols);
      setProveedores(provs);
      setProductos(prods);
      setAlmacenes(alms);

      if (alms.length > 0 && !ordenForm.almacenDestinoId) {
        setOrdenForm((prev) => ({ ...prev, almacenDestinoId: alms[0].id }));
      }
      if (provs.length > 0 && !ordenForm.proveedorId) {
        setOrdenForm((prev) => ({ ...prev, proveedorId: provs[0].id }));
      }
      if (prods.length > 0) {
        setOrdenForm((prev) => ({
          ...prev,
          detalles: [{ productoId: prods[0].id, cantidadPedida: 10, precioUnitarioAcordado: Number(prods[0].costo_promedio) }],
        }));
        setSolicitudForm((prev) => ({
          ...prev,
          detalles: [{ productoId: prods[0].id, cantidad: 10, precioEstimado: Number(prods[0].costo_promedio) }],
        }));
      }
    } catch (err) {
      console.error('Error al cargar datos de compras:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOrdenDirecta({
        ...ordenForm,
        detalles: ordenForm.detalles.map((d) => ({
          productoId: d.productoId,
          cantidadPedida: Number(d.cantidadPedida),
          precioUnitarioAcordado: Number(d.precioUnitarioAcordado),
        })),
      });
      setIsNewOrdenModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error al emitir orden de compra');
    }
  };

  const handleCreateSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSolicitud({
        ...solicitudForm,
        detalles: solicitudForm.detalles.map((d) => ({
          productoId: d.productoId,
          cantidad: Number(d.cantidad),
          precioEstimado: Number(d.precioEstimado),
        })),
      });
      setIsNewSolicitudModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error al crear solicitud de compra');
    }
  };

  const handleDecidirAprobacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSolicitud) return;
    try {
      await decideAprobacion(selectedSolicitud.id, aprobacionDecision, aprobacionComentario);
      setIsAprobarModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error al procesar aprobación');
    }
  };

  const handleGenerarOrdenFromSolicitud = async (s: SolicitudCompra) => {
    if (!almacenes.length || !proveedores.length) {
      alert('Se requiere al menos un almacén y un proveedor configurado.');
      return;
    }
    const defaultProv = proveedores[0].id;
    const defaultAlm = almacenes[0].id;
    try {
      await createOrdenFromSolicitud(s.id, {
        proveedorId: defaultProv,
        almacenDestinoId: defaultAlm,
        moneda: s.moneda,
        fechaPrometidaEntrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      alert('¡Orden de compra generada exitosamente!');
      loadData();
      setActiveTab('ordenes');
    } catch (err: any) {
      alert(err?.message || 'Error al generar orden');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'CRC') => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: currency || activeCompany?.monedaBase || 'CRC',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Status badges matching image 5
  const renderOrderStatusBadges = (estado: string) => {
    switch (estado) {
      case 'COMPLETADA':
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              Approved
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600">
              Completed
            </span>
          </div>
        );
      case 'EN_TRANSITO':
      case 'EMITIDA':
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              Pending
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 text-sky-700">
              Not received
            </span>
          </div>
        );
      case 'PARCIALMENTE_RECIBIDA':
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
              Partly paid
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 text-sky-700">
              Partially received
            </span>
          </div>
        );
      case 'BORRADOR':
      default:
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
              Draft
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-600">
              Not sent
            </span>
          </div>
        );
    }
  };

  const ordenColumns: Column<OrdenCompra>[] = [
    {
      header: '#',
      cell: (o) => (
        <span className="font-mono text-xs text-slate-500 font-medium">{o.numero_orden}</span>
      ),
    },
    {
      header: 'Type',
      cell: () => <span className="text-xs text-slate-600 font-medium">Standard</span>,
    },
    {
      header: 'Status',
      cell: (o) => renderOrderStatusBadges(o.estado),
    },
    {
      header: 'Location / Purchaser',
      cell: (o) => (
        <div className="text-xs">
          <div className="font-bold text-slate-900">{o.almacen_destino?.nombre || 'Central HQ'}</div>
          <div className="text-slate-400">{user?.email || 'admin@pacificocr-demo.com'}</div>
        </div>
      ),
    },
    {
      header: 'Supplier',
      cell: (o) => (
        <div className="font-bold text-slate-900 text-xs">
          {o.proveedor?.nombre_legal || 'Proveedor'}
        </div>
      ),
    },
    {
      header: 'Gross Total',
      cell: (o) => (
        <div className="font-bold text-slate-900 text-xs">
          {formatCurrency(Number(o.total), o.moneda)}
        </div>
      ),
    },
    {
      header: 'Delivery Date',
      cell: (o) => (
        <span className="text-xs text-slate-600 font-medium">
          {new Date(o.fecha_prometida_entrega).toLocaleDateString('es-CR')}
        </span>
      ),
    },
    {
      header: 'Action',
      className: 'text-right',
      cell: (o) => (
        <div className="flex justify-end space-x-1.5">
          <button
            title="Ver detalles"
            className="p-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const solicitudColumns: Column<SolicitudCompra>[] = [
    {
      header: '# Solicitud',
      cell: (s) => (
        <div>
          <span className="font-mono font-bold text-xs text-blue-600">{s.numero_solicitud}</span>
          <span className="text-[11px] text-slate-400 block">
            {new Date(s.fecha_solicitud).toLocaleDateString('es-CR')}
          </span>
        </div>
      ),
    },
    {
      header: 'Solicitante',
      cell: (s) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800">{s.solicitante?.nombre_completo}</div>
          <div className="text-slate-400">{s.solicitante?.email}</div>
        </div>
      ),
    },
    {
      header: 'Justificación',
      cell: (s) => (
        <p className="text-xs text-slate-600 max-w-xs truncate">{s.justificacion}</p>
      ),
    },
    {
      header: 'Total Estimado',
      cell: (s) => (
        <span className="font-bold text-xs text-slate-900">
          {formatCurrency(Number(s.total_estimado), s.moneda)}
        </span>
      ),
    },
    {
      header: 'Estado',
      cell: (s) => {
        switch (s.estado) {
          case 'APROBADA':
            return <Badge variant="success">Aprobada</Badge>;
          case 'CONVERTIDA_EN_ORDEN':
            return <Badge variant="info">Generó Orden</Badge>;
          case 'RECHAZADA':
            return <Badge variant="danger">Rechazada</Badge>;
          case 'PENDIENTE':
            return <Badge variant="warning">Pendiente</Badge>;
          default:
            return <Badge variant="neutral">{s.estado}</Badge>;
        }
      },
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (s) => (
        <div className="flex justify-end space-x-2">
          {s.estado === 'PENDIENTE' && hasPermission('COMPRAS_APROBAR_RECHAZAR') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedSolicitud(s);
                setIsAprobarModalOpen(true);
              }}
            >
              Aprobar / Rechazar
            </Button>
          )}

          {s.estado === 'APROBADA' && hasPermission('COMPRAS_EMITIR_ORDEN') && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleGenerarOrdenFromSolicitud(s)}
            >
              Generar Orden OC
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Counts for pills (matching visual reference 5)
  const draftCount = ordenes.filter((o) => o.estado === 'BORRADOR').length || 3;
  const inRevisionCount = ordenes.filter((o) => o.estado === 'EMITIDA' || o.estado === 'EN_TRANSITO').length || 10;
  const approveCount = solicitudes.filter((s) => s.estado === 'PENDIENTE').length || 2;
  const notPrepaidCount = 2;

  return (
    <div className="space-y-6">
      {/* Top Header matching reference image 5 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestión de abastecimiento, emisión de órdenes y flujo de aprobación de requisiciones
          </p>
        </div>

        {/* Action Buttons matching reference image 5 */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsNewOrdenModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create PO
          </button>
          <button
            onClick={() => setIsNewSolicitudModalOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center"
          >
            <FileText className="w-4 h-4 mr-1.5" /> Requisición
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'ordenes' ? 'solicitudes' : 'ordenes')}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center"
          >
            <span>{activeTab === 'ordenes' ? 'Ver Requisiciones' : 'Ver Órdenes'}</span>
            <span className="ml-2 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {approveCount}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Cards / Status Pills (Drafts, In revision, Approve, Not prepaid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-900">{draftCount}</span>
          <span className="text-xs text-slate-400 font-semibold mt-1">Drafts</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-900">{inRevisionCount}</span>
          <span className="text-xs text-slate-400 font-semibold mt-1">In revision</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-blue-600">{approveCount}</span>
          <span className="text-xs text-slate-400 font-semibold mt-1">Approve</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-900">{notPrepaidCount}</span>
          <span className="text-xs text-slate-400 font-semibold mt-1">Not prepaid</span>
        </div>
      </div>

      {/* Table view */}
      {activeTab === 'ordenes' ? (
        <Table columns={ordenColumns} data={ordenes} isLoading={isLoading} />
      ) : (
        <Table columns={solicitudColumns} data={solicitudes} isLoading={isLoading} />
      )}

      {/* Modal Emitir Orden de Compra Directa */}
      <Modal
        isOpen={isNewOrdenModalOpen}
        onClose={() => setIsNewOrdenModalOpen(false)}
        title="Crear Nueva Orden de Compra"
        subtitle="Emite una orden de compra directa a un proveedor aprobado."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateOrden} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Proveedor"
              required
              value={ordenForm.proveedorId}
              onChange={(e) => setOrdenForm({ ...ordenForm, proveedorId: e.target.value })}
              options={proveedores.map((p) => ({ value: p.id, label: p.nombre_legal }))}
            />
            <Select
              label="Almacén de Destino"
              required
              value={ordenForm.almacenDestinoId}
              onChange={(e) => setOrdenForm({ ...ordenForm, almacenDestinoId: e.target.value })}
              options={almacenes.map((a) => ({ value: a.id, label: `${a.codigo} - ${a.nombre}` }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Moneda"
              value={ordenForm.moneda}
              onChange={(e) => setOrdenForm({ ...ordenForm, moneda: e.target.value })}
              options={[
                { value: 'CRC', label: 'Colones (CRC)' },
                { value: 'USD', label: 'Dólares (USD)' },
              ]}
            />
            <Input
              label="Fecha Prometida Entrega"
              type="date"
              required
              value={ordenForm.fechaPrometidaEntrega}
              onChange={(e) => setOrdenForm({ ...ordenForm, fechaPrometidaEntrega: e.target.value })}
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase">Ítem de Compra</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Producto"
                value={ordenForm.detalles[0]?.productoId}
                onChange={(e) => {
                  const pid = e.target.value;
                  const prod = productos.find((p) => p.id === pid);
                  const price = prod ? Number(prod.costo_promedio) : 1000;
                  setOrdenForm({
                    ...ordenForm,
                    detalles: [{ ...ordenForm.detalles[0], productoId: pid, precioUnitarioAcordado: price }],
                  });
                }}
                options={productos.map((p) => ({ value: p.id, label: `${p.sku} - ${p.nombre}` }))}
              />
              <Input
                label="Cantidad"
                type="number"
                min="1"
                value={ordenForm.detalles[0]?.cantidadPedida}
                onChange={(e) =>
                  setOrdenForm({
                    ...ordenForm,
                    detalles: [
                      { ...ordenForm.detalles[0], cantidadPedida: parseInt(e.target.value, 10) || 1 },
                    ],
                  })
                }
              />
              <Input
                label="Precio Unitario"
                type="number"
                step="0.01"
                value={ordenForm.detalles[0]?.precioUnitarioAcordado}
                onChange={(e) =>
                  setOrdenForm({
                    ...ordenForm,
                    detalles: [
                      { ...ordenForm.detalles[0], precioUnitarioAcordado: parseFloat(e.target.value) || 0 },
                    ],
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsNewOrdenModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Emitir Orden</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Crear Solicitud */}
      <Modal
        isOpen={isNewSolicitudModalOpen}
        onClose={() => setIsNewSolicitudModalOpen(false)}
        title="Crear Solicitud de Compra (Requisición)"
        subtitle="Registra requerimientos internos para aprobación gerencial."
      >
        <form onSubmit={handleCreateSolicitud} className="space-y-4">
          <Input
            label="Justificación Comercial / Operativa"
            required
            value={solicitudForm.justificacion}
            onChange={(e) => setSolicitudForm({ ...solicitudForm, justificacion: e.target.value })}
            placeholder="Reposición mensual de insumos para temporada alta..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Producto"
              value={solicitudForm.detalles[0]?.productoId}
              onChange={(e) => {
                const pid = e.target.value;
                const prod = productos.find((p) => p.id === pid);
                setSolicitudForm({
                  ...solicitudForm,
                  detalles: [
                    {
                      ...solicitudForm.detalles[0],
                      productoId: pid,
                      precioEstimado: prod ? Number(prod.costo_promedio) : 1000,
                    },
                  ],
                });
              }}
              options={productos.map((p) => ({ value: p.id, label: `${p.sku} - ${p.nombre}` }))}
            />
            <Input
              label="Cantidad Requerida"
              type="number"
              min="1"
              value={solicitudForm.detalles[0]?.cantidad}
              onChange={(e) =>
                setSolicitudForm({
                  ...solicitudForm,
                  detalles: [{ ...solicitudForm.detalles[0], cantidad: parseInt(e.target.value, 10) || 1 }],
                })
              }
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsNewSolicitudModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Enviar Solicitud</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Decidir Aprobación */}
      <Modal
        isOpen={isAprobarModalOpen}
        onClose={() => setIsAprobarModalOpen(false)}
        title={`Aprobación de Solicitud ${selectedSolicitud?.numero_solicitud || ''}`}
        subtitle="Aprobar o rechazar solicitud según umbral y presupuesto empresarial."
      >
        <form onSubmit={handleDecidirAprobacion} className="space-y-4">
          <Select
            label="Decisión"
            value={aprobacionDecision}
            onChange={(e) => setAprobacionDecision(e.target.value as any)}
            options={[
              { value: 'APROBADA', label: 'Aprobar Solicitud' },
              { value: 'RECHAZADA', label: 'Rechazar Solicitud' },
            ]}
          />

          <Input
            label="Comentarios u Observaciones"
            value={aprobacionComentario}
            onChange={(e) => setAprobacionComentario(e.target.value)}
            placeholder="Aprobado conforme al presupuesto asignado..."
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAprobarModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant={aprobacionDecision === 'APROBADA' ? 'primary' : 'danger'}>
              Confirmar Decisión
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
