import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Link as LinkIcon,
  AlertTriangle,
  Boxes,
  DollarSign,
  Tag,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import {
  listProductos,
  createProducto,
  linkProductoProveedor,
  listCategorias,
  listUnidadesMedida,
  Producto,
} from '../../api/productos.api';
import { listProveedores, Proveedor } from '../../api/proveedores.api';
import { useAuth } from '../../context/AuthContext';

export const ProductosPage: React.FC = () => {
  const { hasPermission, activeCompany } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBajoMinimo, setFilterBajoMinimo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);

  // Forms
  const [formData, setFormData] = useState({
    sku: '',
    nombre: '',
    descripcion: '',
    categoriaId: '',
    unidadMedidaId: '',
    costoPromedio: 0,
    precioReferencia: 0,
    stockMinimoGlobal: 10,
    stockSeguridad: 5,
  });

  const [linkData, setLinkData] = useState({
    proveedorId: '',
    codigoProductoProveedor: '',
    precioUnitarioAcordado: 0,
    moneda: 'CRC',
    diasEntregaEsperados: 3,
    esProveedorPrincipal: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, cats, uoms, provs] = await Promise.all([
        listProductos({ search: searchTerm || undefined, bajoMinimo: filterBajoMinimo || undefined }),
        listCategorias().catch(() => []),
        listUnidadesMedida().catch(() => []),
        listProveedores().catch(() => []),
      ]);
      setProductos(prods);
      setCategorias(cats);
      setUnidades(uoms);
      setProveedores(provs);
      if (uoms.length > 0 && !formData.unidadMedidaId) {
        setFormData((prev) => ({ ...prev, unidadMedidaId: uoms[0].id }));
      }
    } catch (err) {
      console.error('Error al cargar productos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchTerm, filterBajoMinimo]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProducto({
        ...formData,
        costoPromedio: Number(formData.costoPromedio),
        precioReferencia: Number(formData.precioReferencia),
        stockMinimoGlobal: Number(formData.stockMinimoGlobal),
        stockSeguridad: Number(formData.stockSeguridad),
        categoriaId: formData.categoriaId || undefined,
      });
      setIsNewModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error al crear producto');
    }
  };

  const handleLinkSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProducto) return;
    try {
      await linkProductoProveedor(selectedProducto.id, {
        ...linkData,
        precioUnitarioAcordado: Number(linkData.precioUnitarioAcordado),
        diasEntregaEsperados: Number(linkData.diasEntregaEsperados),
      });
      setIsLinkModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error al vincular proveedor');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: activeCompany?.monedaBase || 'CRC',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const columns: Column<Producto>[] = [
    {
      header: 'Producto / SKU',
      cell: (p) => (
        <div>
          <div className="font-bold text-slate-900">{p.nombre}</div>
          <div className="text-xs text-blue-600 font-mono font-medium">{p.sku}</div>
          {p.descripcion && <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.descripcion}</div>}
        </div>
      ),
    },
    {
      header: 'Categoría & UDM',
      cell: (p) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800 block">{p.categoria?.nombre || 'General'}</span>
          <span className="text-slate-400 text-[11px]">{p.unidad_medida?.simbolo || 'UND'}</span>
        </div>
      ),
    },
    {
      header: 'Costo Promedio',
      cell: (p) => (
        <div className="text-xs font-semibold text-slate-800">
          {formatCurrency(Number(p.costo_promedio))}
        </div>
      ),
    },
    {
      header: 'Stock Total',
      cell: (p) => {
        const totalStock = p.inventario_stock
          ? p.inventario_stock.reduce((sum, s) => sum + Number(s.cantidad_actual), 0)
          : 0;
        const isBajo = totalStock <= Number(p.stock_minimo_global);

        return (
          <div className="text-xs">
            <span className={`font-bold ${isBajo ? 'text-rose-600' : 'text-slate-900'}`}>
              {totalStock} {p.unidad_medida?.simbolo}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Mín: {p.stock_minimo_global} · Seg: {p.stock_seguridad}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Estado',
      cell: (p) => {
        const totalStock = p.inventario_stock
          ? p.inventario_stock.reduce((sum, s) => sum + Number(s.cantidad_actual), 0)
          : 0;
        if (totalStock === 0) return <Badge variant="danger" size="sm">Sin Stock</Badge>;
        if (totalStock <= Number(p.stock_minimo_global)) return <Badge variant="warning" size="sm">Bajo Mínimo</Badge>;
        return <Badge variant="success" size="sm">Óptimo</Badge>;
      },
    },
    {
      header: 'Acciones',
      className: 'text-right',
      cell: (p) => (
        <div className="flex justify-end space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProducto(p);
              setIsLinkModalOpen(true);
            }}
          >
            <LinkIcon className="w-3.5 h-3.5 mr-1" /> Proveedor
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Catálogo de Productos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Control de ítems, costos de reposición, umbrales de seguridad y catálogo de proveedores
          </p>
        </div>

        {hasPermission('PRODUCTOS_CREAR_EDITAR') && (
          <Button onClick={() => setIsNewModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo Producto
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por SKU o descripción..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => setFilterBajoMinimo(!filterBajoMinimo)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
              filterBajoMinimo
                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Solo Bajo Mínimo</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total: <span className="font-bold text-slate-800">{productos.length}</span> ítems en catálogo
        </div>
      </div>

      <Table columns={columns} data={productos} isLoading={isLoading} />

      {/* Modal Nuevo Producto */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Crear Nuevo Producto"
        subtitle="Registra las especificaciones técnicas y los umbrales de reorden."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Código SKU"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              placeholder="Ej. MED-GNT-001"
            />
            <Input
              label="Nombre del Producto"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Guantes Quirúrgicos de Nitrilo"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Categoría"
              value={formData.categoriaId}
              onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
              options={[
                { value: '', label: 'Seleccionar categoría...' },
                ...categorias.map((c) => ({ value: c.id, label: c.nombre })),
              ]}
            />
            <Select
              label="Unidad de Medida"
              required
              value={formData.unidadMedidaId}
              onChange={(e) => setFormData({ ...formData, unidadMedidaId: e.target.value })}
              options={unidades.map((u) => ({
                value: u.id,
                label: `${u.nombre} (${u.simbolo})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Costo Promedio (Reposición)"
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.costoPromedio}
              onChange={(e) => setFormData({ ...formData, costoPromedio: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Precio de Referencia"
              type="number"
              step="0.01"
              min="0"
              value={formData.precioReferencia}
              onChange={(e) => setFormData({ ...formData, precioReferencia: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Stock Mínimo Global"
              type="number"
              min="0"
              required
              value={formData.stockMinimoGlobal}
              onChange={(e) => setFormData({ ...formData, stockMinimoGlobal: parseInt(e.target.value, 10) || 0 })}
            />
            <Input
              label="Stock de Seguridad"
              type="number"
              min="0"
              required
              value={formData.stockSeguridad}
              onChange={(e) => setFormData({ ...formData, stockSeguridad: parseInt(e.target.value, 10) || 0 })}
            />
          </div>

          <Input
            label="Descripción o Ficha Técnica"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Características, presentación, empaque..."
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsNewModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Producto</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Vincular Proveedor */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title={`Vincular Proveedor a ${selectedProducto?.nombre || ''}`}
        subtitle="Registra el precio pactado y tiempos de entrega convenidos."
      >
        <form onSubmit={handleLinkSupplier} className="space-y-4">
          <Select
            label="Proveedor Comercial"
            required
            value={linkData.proveedorId}
            onChange={(e) => setLinkData({ ...linkData, proveedorId: e.target.value })}
            options={[
              { value: '', label: 'Seleccionar proveedor...' },
              ...proveedores.map((p) => ({ value: p.id, label: p.nombre_legal })),
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Código Proveedor (SKU Externo)"
              value={linkData.codigoProductoProveedor}
              onChange={(e) => setLinkData({ ...linkData, codigoProductoProveedor: e.target.value })}
              placeholder="Ej. SUM-GNT-45"
            />
            <Input
              label="Precio Pactado"
              type="number"
              step="0.01"
              min="0"
              required
              value={linkData.precioUnitarioAcordado}
              onChange={(e) =>
                setLinkData({ ...linkData, precioUnitarioAcordado: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Moneda"
              value={linkData.moneda}
              onChange={(e) => setLinkData({ ...linkData, moneda: e.target.value })}
              options={[
                { value: 'CRC', label: 'CRC (Colones)' },
                { value: 'USD', label: 'USD (Dólares)' },
              ]}
            />
            <Input
              label="Días Entrega Esperados"
              type="number"
              min="1"
              required
              value={linkData.diasEntregaEsperados}
              onChange={(e) =>
                setLinkData({ ...linkData, diasEntregaEsperados: parseInt(e.target.value, 10) || 1 })
              }
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsLinkModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Vincular Proveedor</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
