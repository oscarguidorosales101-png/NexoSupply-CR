import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Boxes,
  Plus,
  ArrowDownToLine,
  SlidersHorizontal,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import {
  getStock,
  getKardex,
  adjustStock,
  createRecepcion,
  listAlmacenes,
  InventarioStock,
  KardexMovement,
} from '../../api/inventario.api';
import { listOrdenes, OrdenCompra } from '../../api/compras.api';
import { listProductos, Producto } from '../../api/productos.api';
import { useAuth } from '../../context/AuthContext';

export const InventarioPage: React.FC = () => {
  const { hasPermission, activeCompany } = useAuth();
  const [activeTab, setActiveTab] = useState<'stock' | 'kardex'>('stock');
  const [stockList, setStockList] = useState<InventarioStock[]>([]);
  const [kardexList, setKardexList] = useState<KardexMovement[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'instock' | 'low' | 'out'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isRecepcionModalOpen, setIsRecepcionModalOpen] = useState(false);
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);

  // Form Recepción
  const [recepcionForm, setRecepcionForm] = useState({
    ordenCompraId: '',
    almacenId: '',
    numeroComprobanteProveedor: '',
    observaciones: '',
    detalles: [{ productoId: '', cantidadRecibida: 10, costoUnitarioFactura: 1500 }],
  });

  // Form Ajuste
  const [ajusteForm, setAjusteForm] = useState({
    almacenId: '',
    productoId: '',
    tipoMovimiento: 'ENTRADA_AJUSTE' as 'ENTRADA_AJUSTE' | 'SALIDA_AJUSTE',
    cantidad: 5,
    motivo: 'Ajuste por conteo físico anual',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stocks, kardex, alms, prods, ords] = await Promise.all([
        getStock(),
        getKardex({ limit: 100 }),
        listAlmacenes().catch(() => []),
        listProductos().catch(() => []),
        listOrdenes().catch(() => []),
      ]);
      setStockList(stocks);
      setKardexList(kardex);
      setAlmacenes(alms);
      setProductos(prods);
      setOrdenes(ords);

      if (alms.length > 0) {
        setRecepcionForm((prev) => ({ ...prev, almacenId: alms[0].id }));
        setAjusteForm((prev) => ({ ...prev, almacenId: alms[0].id }));
      }
      if (ords.length > 0) {
        setRecepcionForm((prev) => ({ ...prev, ordenCompraId: ords[0].id }));
      }
      if (prods.length > 0) {
        setRecepcionForm((prev) => ({
          ...prev,
          detalles: [
            {
              productoId: prods[0].id,
              cantidadRecibida: 10,
              costoUnitarioFactura: Number(prods[0].costo_promedio),
            },
          ],
        }));
        setAjusteForm((prev) => ({ ...prev, productoId: prods[0].id }));
      }
    } catch (err) {
      console.error('Error al cargar inventario:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecepcionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRecepcion({
        ...recepcionForm,
        detalles: recepcionForm.detalles.map((d) => ({
          productoId: d.productoId,
          cantidadRecibida: Number(d.cantidadRecibida),
          costoUnitarioFactura: Number(d.costoUnitarioFactura),
        })),
      });
      alert('¡Recepción registrada exitosamente! Stock y Kardex actualizados.');
      setIsRecepcionModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error al procesar recepción');
    }
  };

  const handleAjusteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adjustStock({
        ...ajusteForm,
        cantidad: Number(ajusteForm.cantidad),
      });
      alert('¡Ajuste de inventario aplicado!');
      setIsAjusteModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error al aplicar ajuste');
    }
  };

  // Filter stock items
  const filteredStocks = stockList.filter((s) => {
    const matchesSearch =
      s.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.producto.sku.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const actual = Number(s.cantidad_actual);
    const min = Number(s.stock_minimo);

    if (filterStockStatus === 'instock') return actual > min;
    if (filterStockStatus === 'low') return actual <= min && actual > 0;
    if (filterStockStatus === 'out') return actual === 0;
    return true;
  });

  const totalValuation = stockList.reduce(
    (sum, s) => sum + Number(s.cantidad_actual) * Number(s.producto.costo_promedio),
    0
  );
  const lowStockCount = stockList.filter((s) => Number(s.cantidad_actual) <= Number(s.stock_minimo)).length;

  const stockColumns: Column<InventarioStock>[] = [
    {
      header: 'Producto / SKU',
      cell: (s) => (
        <div>
          <span className="font-bold text-slate-900 block">{s.producto.nombre}</span>
          <span className="text-xs text-blue-600 font-mono">{s.producto.sku}</span>
        </div>
      ),
    },
    {
      header: 'Almacén & Pasillo',
      cell: (s) => (
        <div className="text-xs">
          <span className="font-bold text-slate-800 block">{s.almacen.nombre}</span>
          <span className="text-slate-400">
            {s.ubicacion_pasillo ? `Pasillo ${s.ubicacion_pasillo}` : 'Ubicación estándar'}
          </span>
        </div>
      ),
    },
    {
      header: 'Existencia Actual',
      cell: (s) => (
        <div className="text-xs">
          <span className="font-extrabold text-slate-900 text-sm block">
            {s.cantidad_actual} {s.producto.unidad_medida.simbolo}
          </span>
          <span className="text-[11px] text-slate-400">Reservadas: {s.cantidad_reservada}</span>
        </div>
      ),
    },
    {
      header: 'Mínimo Requerido',
      cell: (s) => (
        <span className="text-xs font-semibold text-slate-600">
          {s.stock_minimo} {s.producto.unidad_medida.simbolo}
        </span>
      ),
    },
    {
      header: 'Estado de Existencia',
      cell: (s) => {
        const actual = Number(s.cantidad_actual);
        const min = Number(s.stock_minimo);
        if (actual === 0) return <Badge variant="danger">Sin Stock</Badge>;
        if (actual <= min) return <Badge variant="warning">Bajo Mínimo</Badge>;
        return <Badge variant="success">Óptimo</Badge>;
      },
    },
  ];

  const kardexColumns: Column<KardexMovement>[] = [
    {
      header: 'Fecha / Hora',
      cell: (k) => (
        <span className="text-xs text-slate-600 font-mono">
          {new Date(k.createdAt).toLocaleString('es-CR')}
        </span>
      ),
    },
    {
      header: 'Tipo Movimiento',
      cell: (k) => {
        if (k.tipo_movimiento.includes('ENTRADA')) {
          return <Badge variant="success">{k.tipo_movimiento}</Badge>;
        }
        return <Badge variant="danger">{k.tipo_movimiento}</Badge>;
      },
    },
    {
      header: 'Producto',
      cell: (k) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{k.producto.nombre}</span>
          <span className="text-[11px] text-slate-400 font-mono">{k.producto.sku}</span>
        </div>
      ),
    },
    {
      header: 'Cantidad',
      cell: (k) => (
        <span className="text-xs font-bold text-slate-900">
          {k.tipo_movimiento.includes('ENTRADA') ? `+${k.cantidad}` : `-${k.cantidad}`}
        </span>
      ),
    },
    {
      header: 'Stock Ant → Post',
      cell: (k) => (
        <span className="text-xs font-mono text-slate-600">
          {k.stock_anterior} → {k.stock_posterior}
        </span>
      ),
    },
    {
      header: 'Motivo / Referencia',
      cell: (k) => (
        <div className="text-xs max-w-xs truncate text-slate-600">
          <span>{k.motivo}</span>
          <span className="text-[11px] text-slate-400 block">{k.usuario?.nombre_completo}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header matching image 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Stock & Warehouses</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Products, locations, physical receptions, and movement audit trail
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            onClick={() => setIsAjusteModalOpen(true)}
            className="flex items-center"
          >
            <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Ajuste Manual
          </Button>

          <Button
            onClick={() => setIsRecepcionModalOpen(true)}
            className="flex items-center bg-blue-600 hover:bg-blue-700"
          >
            <ArrowDownToLine className="w-4 h-4 mr-1.5" /> Recepción Física
          </Button>
        </div>
      </div>

      {/* Overview StatCards matching reference image 4 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Products</span>
            <Boxes className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-3">{stockList.length}</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">
            ₡{totalValuation.toLocaleString('es-CR')} total value
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Warehouses</span>
            <Warehouse className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-3">{almacenes.length || 3}</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">Alajuela & Puntarenas</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PO Orders</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-3">{ordenes.length || 24}</div>
          <div className="text-xs text-slate-400 mt-1 font-medium">En proceso de recepción</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-3">{lowStockCount}</div>
          <div className="text-xs text-rose-500 mt-1 font-medium">Below minimum threshold</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar matching image 4 */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Sub-tabs: All, In stock, Low, Out */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab('stock');
                setFilterStockStatus('all');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 ${
                activeTab === 'stock' && filterStockStatus === 'all'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>All</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800">
                {stockList.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('stock');
                setFilterStockStatus('instock');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 ${
                activeTab === 'stock' && filterStockStatus === 'instock'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>In stock</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {stockList.length - lowStockCount}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('stock');
                setFilterStockStatus('low');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 ${
                activeTab === 'stock' && filterStockStatus === 'low'
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>Low</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
                {lowStockCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('kardex')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 ${
                activeTab === 'kardex' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span>Kardex / Movimientos</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ítem o ubicación..."
              className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table view */}
      {activeTab === 'stock' ? (
        <Table columns={stockColumns} data={filteredStocks} isLoading={isLoading} />
      ) : (
        <Table columns={kardexColumns} data={kardexList} isLoading={isLoading} />
      )}

      {/* Modal Recepción de Mercancía Física */}
      <Modal
        isOpen={isRecepcionModalOpen}
        onClose={() => setIsRecepcionModalOpen(false)}
        title="Registrar Recepción de Mercancía Física"
        subtitle="Ingresa el documento de entrega del proveedor y las unidades inspeccionadas."
        maxWidth="lg"
      >
        <form onSubmit={handleRecepcionSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Orden de Compra Referencia"
              required
              value={recepcionForm.ordenCompraId}
              onChange={(e) => setRecepcionForm({ ...recepcionForm, ordenCompraId: e.target.value })}
              options={ordenes.map((o) => ({
                value: o.id,
                label: `${o.numero_orden} - ${o.proveedor?.nombre_legal}`,
              }))}
            />
            <Select
              label="Almacén de Entrada"
              required
              value={recepcionForm.almacenId}
              onChange={(e) => setRecepcionForm({ ...recepcionForm, almacenId: e.target.value })}
              options={almacenes.map((a) => ({ value: a.id, label: `${a.codigo} - ${a.nombre}` }))}
            />
          </div>

          <Input
            label="Número de Factura / Conduce del Proveedor"
            required
            value={recepcionForm.numeroComprobanteProveedor}
            onChange={(e) =>
              setRecepcionForm({ ...recepcionForm, numeroComprobanteProveedor: e.target.value })
            }
            placeholder="Ej. FAC-0012948"
          />

          <div className="p-3 bg-slate-50 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase">Detalle de Recepción</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Producto"
                value={recepcionForm.detalles[0]?.productoId}
                onChange={(e) => {
                  const pid = e.target.value;
                  const prod = productos.find((p) => p.id === pid);
                  setRecepcionForm({
                    ...recepcionForm,
                    detalles: [
                      {
                        ...recepcionForm.detalles[0],
                        productoId: pid,
                        costoUnitarioFactura: prod ? Number(prod.costo_promedio) : 1000,
                      },
                    ],
                  });
                }}
                options={productos.map((p) => ({ value: p.id, label: `${p.sku} - ${p.nombre}` }))}
              />
              <Input
                label="Cantidad Recibida"
                type="number"
                min="1"
                value={recepcionForm.detalles[0]?.cantidadRecibida}
                onChange={(e) =>
                  setRecepcionForm({
                    ...recepcionForm,
                    detalles: [
                      { ...recepcionForm.detalles[0], cantidadRecibida: parseInt(e.target.value, 10) || 1 },
                    ],
                  })
                }
              />
              <Input
                label="Costo Unitario Factura"
                type="number"
                step="0.01"
                value={recepcionForm.detalles[0]?.costoUnitarioFactura}
                onChange={(e) =>
                  setRecepcionForm({
                    ...recepcionForm,
                    detalles: [
                      {
                        ...recepcionForm.detalles[0],
                        costoUnitarioFactura: parseFloat(e.target.value) || 0,
                      },
                    ],
                  })
                }
              />
            </div>
          </div>

          <Input
            label="Observaciones de Inspección"
            value={recepcionForm.observaciones}
            onChange={(e) => setRecepcionForm({ ...recepcionForm, observaciones: e.target.value })}
            placeholder="Cajas en buen estado, selladas de fábrica..."
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsRecepcionModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Confirmar Recepción</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Ajuste Manual de Inventario */}
      <Modal
        isOpen={isAjusteModalOpen}
        onClose={() => setIsAjusteModalOpen(false)}
        title="Ajuste Manual de Inventario"
        subtitle="Registra entradas o mermas con justificación para el Kardex."
      >
        <form onSubmit={handleAjusteSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Almacén"
              value={ajusteForm.almacenId}
              onChange={(e) => setAjusteForm({ ...ajusteForm, almacenId: e.target.value })}
              options={almacenes.map((a) => ({ value: a.id, label: a.nombre }))}
            />
            <Select
              label="Tipo de Ajuste"
              value={ajusteForm.tipoMovimiento}
              onChange={(e) => setAjusteForm({ ...ajusteForm, tipoMovimiento: e.target.value as any })}
              options={[
                { value: 'ENTRADA_AJUSTE', label: 'Entrada por Ajuste (+) ' },
                { value: 'SALIDA_AJUSTE', label: 'Salida / Merma / Daño (-)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Producto"
              value={ajusteForm.productoId}
              onChange={(e) => setAjusteForm({ ...ajusteForm, productoId: e.target.value })}
              options={productos.map((p) => ({ value: p.id, label: `${p.sku} - ${p.nombre}` }))}
            />
            <Input
              label="Cantidad a Ajustar"
              type="number"
              min="1"
              value={ajusteForm.cantidad}
              onChange={(e) =>
                setAjusteForm({ ...ajusteForm, cantidad: parseInt(e.target.value, 10) || 1 })
              }
            />
          </div>

          <Input
            label="Justificación Obligatoria del Ajuste"
            required
            value={ajusteForm.motivo}
            onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
            placeholder="Conteo físico, rotura accidental, caducidad..."
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAjusteModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Aplicar Ajuste</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
