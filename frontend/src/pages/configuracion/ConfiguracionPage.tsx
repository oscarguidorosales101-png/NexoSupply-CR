import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Users,
  Shield,
  Lock,
  Plus,
  Mail,
  CheckCircle,
  Save,
} from 'lucide-react';
import { Table, Column } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import {
  getCompanyProfile,
  updateCompanyProfile,
  updateCompanyConfig,
  listMembers,
  inviteMember,
  listRolesAndPermissions,
} from '../../api/empresas.api';
import { changePassword } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';

export const ConfiguracionPage: React.FC = () => {
  const { hasPermission, activeCompany, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState<'perfil' | 'reglas' | 'equipo' | 'seguridad'>('perfil');
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Perfil form
  const [perfilForm, setPerfilForm] = useState({
    razonSocial: '',
    nombreComercial: '',
    telefono: '',
    emailContacto: '',
    direccion: '',
  });

  // Reglas form
  const [configForm, setConfigForm] = useState({
    monedaBase: 'CRC',
    diasAlertaRetraso: 2,
    margenSeguridadInventarioPct: 10,
    montoMaximoAprobacionAutomatica: 100000,
  });

  // Invite modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    rolId: '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prof, mems, rp] = await Promise.all([
        getCompanyProfile().catch(() => null),
        listMembers().catch(() => []),
        listRolesAndPermissions().catch(() => ({ roles: [], permisos: [] })),
      ]);

      if (prof) {
        setPerfilForm({
          razonSocial: prof.razon_social || '',
          nombreComercial: prof.nombre_comercial || '',
          telefono: prof.telefono || '',
          emailContacto: prof.email_contacto || '',
          direccion: prof.direccion || '',
        });
        if (prof.configuracion) {
          setConfigForm({
            monedaBase: prof.configuracion.moneda_base || 'CRC',
            diasAlertaRetraso: prof.configuracion.dias_alerta_retraso || 2,
            margenSeguridadInventarioPct: Number(prof.configuracion.margen_seguridad_inventario_pct || 10),
            montoMaximoAprobacionAutomatica: Number(prof.configuracion.monto_maximo_aprobacion_automatica || 100000),
          });
        }
      }

      setMembers(mems);
      setRoles(rp.roles || []);
      if (rp.roles && rp.roles.length > 0) {
        setInviteForm((prev) => ({ ...prev, rolId: rp.roles[0].id }));
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCompanyProfile(perfilForm);
      alert('¡Perfil de la empresa actualizado!');
      refreshSession();
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar perfil');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCompanyConfig({
        ...configForm,
        diasAlertaRetraso: Number(configForm.diasAlertaRetraso),
        margenSeguridadInventarioPct: Number(configForm.margenSeguridadInventarioPct),
        montoMaximoAprobacionAutomatica: Number(configForm.montoMaximoAprobacionAutomatica),
      });
      alert('¡Reglas operativas y umbrales de aprobación actualizados!');
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar configuración');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteMember(inviteForm.email, inviteForm.rolId);
      alert('¡Invitación enviada al colaborador!');
      setIsInviteModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error al invitar colaborador');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Las contraseñas nuevas no coinciden');
      return;
    }
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      alert('¡Contraseña actualizada con éxito!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      alert(err?.message || 'Error al cambiar contraseña');
    }
  };

  const memberColumns: Column<any>[] = [
    {
      header: 'Colaborador',
      cell: (m) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{m.usuario?.nombre_completo}</span>
          <span className="text-slate-400 text-xs">{m.usuario?.email}</span>
        </div>
      ),
    },
    {
      header: 'Rol Empresarial',
      cell: (m) => (
        <span className="text-xs font-semibold text-blue-600">{m.rol?.nombre}</span>
      ),
    },
    {
      header: 'Estado',
      cell: (m) => (
        <Badge variant={m.activo ? 'success' : 'neutral'} size="sm">
          {m.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Configuración de la Empresa
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Información corporativa, umbrales de abastecimiento, colaboradores y seguridad
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('perfil')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'perfil'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Perfil Corporativo
        </button>
        <button
          onClick={() => setActiveTab('reglas')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'reglas'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Reglas y Umbrales
        </button>
        <button
          onClick={() => setActiveTab('equipo')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'equipo'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Equipo y Roles
        </button>
        <button
          onClick={() => setActiveTab('seguridad')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'seguridad'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Seguridad
        </button>
      </div>

      {/* Tab: Perfil */}
      {activeTab === 'perfil' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-2xl">
          <form onSubmit={handleSavePerfil} className="space-y-4">
            <Input
              label="Razón Social (Legal)"
              required
              value={perfilForm.razonSocial}
              onChange={(e) => setPerfilForm({ ...perfilForm, razonSocial: e.target.value })}
            />
            <Input
              label="Nombre Comercial"
              value={perfilForm.nombreComercial}
              onChange={(e) => setPerfilForm({ ...perfilForm, nombreComercial: e.target.value })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Teléfono Central"
                value={perfilForm.telefono}
                onChange={(e) => setPerfilForm({ ...perfilForm, telefono: e.target.value })}
              />
              <Input
                label="Email de Contacto"
                type="email"
                value={perfilForm.emailContacto}
                onChange={(e) => setPerfilForm({ ...perfilForm, emailContacto: e.target.value })}
              />
            </div>
            <Input
              label="Dirección de la Sede"
              value={perfilForm.direccion}
              onChange={(e) => setPerfilForm({ ...perfilForm, direccion: e.target.value })}
            />
            <div className="flex justify-end pt-3">
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Reglas y Umbrales */}
      {activeTab === 'reglas' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-2xl">
          <form onSubmit={handleSaveConfig} className="space-y-5">
            <Select
              label="Moneda Base del Sistema"
              value={configForm.monedaBase}
              onChange={(e) => setConfigForm({ ...configForm, monedaBase: e.target.value })}
              options={[
                { value: 'CRC', label: 'Colones Costarricenses (CRC)' },
                { value: 'USD', label: 'Dólares Americanos (USD)' },
              ]}
            />
            <Input
              label="Umbral Máximo para Auto-Aprobación de Solicitudes (RN-02)"
              type="number"
              min="0"
              value={configForm.montoMaximoAprobacionAutomatica}
              onChange={(e) =>
                setConfigForm({
                  ...configForm,
                  montoMaximoAprobacionAutomatica: parseFloat(e.target.value) || 0,
                })
              }
              helperText="Las solicitudes por debajo de este monto pueden ser auto-aprobadas si la política lo autoriza."
            />
            <Input
              label="Días de Tolerancia para Alertas de Retraso de Proveedor"
              type="number"
              min="1"
              value={configForm.diasAlertaRetraso}
              onChange={(e) =>
                setConfigForm({ ...configForm, diasAlertaRetraso: parseInt(e.target.value, 10) || 1 })
              }
              helperText="Genera alerta en el sistema si el proveedor supera esta cantidad de días tras la fecha prometida."
            />
            <div className="flex justify-end pt-3">
              <Button type="submit">Guardar Parámetros</Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Equipo y Roles */}
      {activeTab === 'equipo' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Miembros con Acceso a la Empresa</h3>
            {hasPermission('USUARIOS_GESTIONAR') && (
              <Button onClick={() => setIsInviteModalOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Invitar Colaborador
              </Button>
            )}
          </div>
          <Table columns={memberColumns} data={members} isLoading={isLoading} />
        </div>
      )}

      {/* Tab: Seguridad */}
      {activeTab === 'seguridad' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-md">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Actualizar Mi Contraseña</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Contraseña Actual"
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            />
            <Input
              label="Nueva Contraseña"
              type="password"
              required
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              helperText="Mínimo 8 caracteres con letras y números."
            />
            <Input
              label="Confirmar Nueva Contraseña"
              type="password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            />
            <div className="flex justify-end pt-3">
              <Button type="submit">Cambiar Contraseña</Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Invitar Miembro */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invitar Colaborador a la Empresa"
        subtitle="Asigna un rol con permisos específicos a un usuario existente."
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Correo Electrónico del Usuario"
            type="email"
            required
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            placeholder="colaborador@empresa.com"
          />

          <Select
            label="Rol a Asignar"
            required
            value={inviteForm.rolId}
            onChange={(e) => setInviteForm({ ...inviteForm, rolId: e.target.value })}
            options={roles.map((r) => ({ value: r.id, label: r.nombre }))}
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Enviar Invitación</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
