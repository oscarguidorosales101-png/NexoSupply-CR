import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Building,
  UserPlus,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import {
  listProveedores,
  createProveedor,
  addContactoProveedor,
  Proveedor,
} from '../../api/proveedores.api';
import { useAuth } from '../../context/AuthContext';

export const ProveedoresPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    identificadorFiscal: '',
    nombreLegal: '',
    nombreFantasia: '',
    clasificacion: 'A',
    terminosPagoDias: 30,
    monedaPreferida: 'CRC',
    leadTimePromedioDias: 5,
    email: '',
    telefono: '',
    direccion: '',
  });

  const [contactData, setContactData] = useState({
    nombreCompleto: '',
    puesto: '',
    email: '',
    telefono: '',
    esPrincipal: true,
  });

  const loadProveedores = async () => {
    setIsLoading(true);
    try {
      const data = await listProveedores({ search: searchTerm || undefined });
      setProveedores(data);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProveedores();
  }, [searchTerm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProveedor(formData);
      setIsNewModalOpen(false);
      setFormData({
        identificadorFiscal: '',
        nombreLegal: '',
        nombreFantasia: '',
        clasificacion: 'A',
        terminosPagoDias: 30,
        monedaPreferida: 'CRC',
        leadTimePromedioDias: 5,
        email: '',
        telefono: '',
        direccion: '',
      });
      loadProveedores();
    } catch (err: any) {
      alert(err?.message || 'Error al crear proveedor');
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProveedor) return;
    try {
      await addContactoProveedor(selectedProveedor.id, contactData);
      setIsContactModalOpen(false);
      setContactData({
        nombreCompleto: '',
        puesto: '',
        email: '',
        telefono: '',
        esPrincipal: true,
      });
      loadProveedores();
    } catch (err: any) {
      alert(err?.message || 'Error al agregar contacto');
    }
  };

  const getClasificacionBadge = (c: string) => {
    switch (c) {
      case 'A':
        return <Badge variant="success">Clase A · Estratégico</Badge>;
      case 'B':
        return <Badge variant="primary">Clase B · Recurrente</Badge>;
      default:
        return <Badge variant="warning">Clase C · Ocasional</Badge>;
    }
  };

  const columns: Column<Proveedor>[] = [
    {
      header: 'Proveedor',
      cell: (p) => (
        <div>
          <div className="font-bold text-slate-900">{p.nombre_legal}</div>
          {p.nombre_fantasia && (
            <div className="text-xs text-slate-500 font-medium">{p.nombre_fantasia}</div>
          )}
          <div className="text-[11px] text-slate-400">ID: {p.identificador_fiscal}</div>
        </div>
      ),
    },
    {
      header: 'Clasificación',
      cell: (p) => getClasificacionBadge(p.clasificacion),
    },
    {
      header: 'Términos & Moneda',
      cell: (p) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800">{p.terminos_pago_dias} días</span>
          <span className="text-slate-400 block">{p.moneda_preferida}</span>
        </div>
      ),
    },
    {
      header: 'Lead Time',
      cell: (p) => (
        <div className="flex items-center text-xs font-medium text-slate-700">
          <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <span>{p.lead_time_promedio_dias} días</span>
        </div>
      ),
    },
    {
      header: 'Contacto',
      cell: (p) => (
        <div className="text-xs space-y-0.5">
          {p.email && (
            <div className="flex items-center text-slate-600">
              <Mail className="w-3 h-3 mr-1 text-slate-400" /> {p.email}
            </div>
          )}
          {p.telefono && (
            <div className="flex items-center text-slate-600">
              <Phone className="w-3 h-3 mr-1 text-slate-400" /> {p.telefono}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: (p) => (
        <Badge variant={p.activo ? 'success' : 'neutral'} size="sm">
          {p.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
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
              setSelectedProveedor(p);
              setIsContactModalOpen(true);
            }}
          >
            <UserPlus className="w-3.5 h-3.5 mr-1" /> Contacto
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Directorio de Proveedores</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestión integral de socios comerciales, términos de pago y evaluación de cumplimiento
          </p>
        </div>

        {hasPermission('PROVEEDORES_CREAR_EDITAR') && (
          <Button onClick={() => setIsNewModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Nuevo Proveedor
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o cédula jurídica..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total: <span className="font-bold text-slate-800">{proveedores.length}</span> proveedores registrados
        </div>
      </div>

      {/* Table */}
      <Table columns={columns} data={proveedores} isLoading={isLoading} />

      {/* Modal Nuevo Proveedor */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Registrar Nuevo Proveedor"
        subtitle="Ingresa la información comercial y tributaria del proveedor."
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Identificador Fiscal (Cédula Jurídica)"
              required
              value={formData.identificadorFiscal}
              onChange={(e) => setFormData({ ...formData, identificadorFiscal: e.target.value })}
              placeholder="3-101-000000"
            />
            <Select
              label="Clasificación"
              value={formData.clasificacion}
              onChange={(e) => setFormData({ ...formData, clasificacion: e.target.value })}
              options={[
                { value: 'A', label: 'Clase A (Estratégico / Crítico)' },
                { value: 'B', label: 'Clase B (Recurrente / Importante)' },
                { value: 'C', label: 'Clase C (Ocasional / Commodities)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Razón Social (Nombre Legal)"
              required
              value={formData.nombreLegal}
              onChange={(e) => setFormData({ ...formData, nombreLegal: e.target.value })}
              placeholder="Ej. Distribuidora Médica S.A."
            />
            <Input
              label="Nombre Comercial (Fantasía)"
              value={formData.nombreFantasia}
              onChange={(e) => setFormData({ ...formData, nombreFantasia: e.target.value })}
              placeholder="Ej. MediTech CR"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Términos Pago (Días)"
              type="number"
              min="0"
              required
              value={formData.terminosPagoDias}
              onChange={(e) =>
                setFormData({ ...formData, terminosPagoDias: parseInt(e.target.value, 10) || 0 })
              }
            />
            <Select
              label="Moneda Preferida"
              value={formData.monedaPreferida}
              onChange={(e) => setFormData({ ...formData, monedaPreferida: e.target.value })}
              options={[
                { value: 'CRC', label: 'Colones (CRC)' },
                { value: 'USD', label: 'Dólares (USD)' },
              ]}
            />
            <Input
              label="Lead Time Promedio (Días)"
              type="number"
              min="1"
              required
              value={formData.leadTimePromedioDias}
              onChange={(e) =>
                setFormData({ ...formData, leadTimePromedioDias: parseInt(e.target.value, 10) || 1 })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email de Contacto"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ventas@proveedor.com"
            />
            <Input
              label="Teléfono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="+506 2200-0000"
            />
          </div>

          <Input
            label="Dirección Física"
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            placeholder="Provincia, Cantón, Distrito, señas exactas..."
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsNewModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Proveedor</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Agregar Contacto */}
      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title={`Agregar Contacto a ${selectedProveedor?.nombre_legal || ''}`}
        subtitle="Registra un ejecutivo de cuenta o contacto técnico."
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          <Input
            label="Nombre Completo"
            required
            value={contactData.nombreCompleto}
            onChange={(e) => setContactData({ ...contactData, nombreCompleto: e.target.value })}
            placeholder="Lic. María Delgado"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Puesto / Cargo"
              value={contactData.puesto}
              onChange={(e) => setContactData({ ...contactData, puesto: e.target.value })}
              placeholder="Gerente de Cuentas Clave"
            />
            <Input
              label="Teléfono Directo"
              value={contactData.telefono}
              onChange={(e) => setContactData({ ...contactData, telefono: e.target.value })}
              placeholder="+506 8888-0000"
            />
          </div>

          <Input
            label="Email de Notificaciones"
            type="email"
            required
            value={contactData.email}
            onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
            placeholder="mdelgado@proveedor.com"
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsContactModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Contacto</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
