import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Warehouse,
  Star,
  AlertTriangle,
  GitBranch,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onOpenSwitchCompany?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSwitchCompany }) => {
  const { user, activeCompany, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Proveedores', path: '/proveedores', icon: Users },
    { name: 'Productos', path: '/productos', icon: Package },
    { name: 'Compras', path: '/compras', icon: ShoppingCart },
    { name: 'Inventario', path: '/inventario', icon: Warehouse },
    { name: 'Evaluaciones', path: '/evaluaciones', icon: Star },
    { name: 'Riesgos', path: '/riesgos', icon: AlertTriangle },
    { name: 'Simulaciones', path: '/simulaciones', icon: GitBranch },
    { name: 'Reportes', path: '/reportes', icon: BarChart3 },
    { name: 'Configuración', path: '/configuracion', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'NS';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <aside className="w-64 bg-[#0B192C] text-slate-300 flex flex-col h-screen select-none sticky top-0 flex-shrink-0 z-30 shadow-xl border-r border-[#142742]">
      {/* Brand Header */}
      <div className="px-6 py-5 flex items-center space-x-3 border-b border-[#142742]/80">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/25">
          N
        </div>
        <div>
          <h1 className="text-white font-bold text-base leading-tight tracking-tight">NexoSupply CR</h1>
          <p className="text-[11px] text-blue-300 font-medium tracking-wide">Conectando tu cadena</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#142742]/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 mr-3 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Feature Optimization Card */}
      <div className="px-4 py-2">
        <div className="bg-gradient-to-br from-[#142742] to-[#1E3E62]/70 p-3.5 rounded-2xl border border-blue-500/20 text-center relative overflow-hidden">
          <div className="flex items-center justify-center w-8 h-8 mx-auto mb-2 rounded-full bg-blue-500/20 text-blue-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-semibold text-white">Optimiza tu abastecimiento</h4>
          <p className="text-[11px] text-slate-300 mt-1">Decisiones más inteligentes para tu empresa.</p>
          <button
            onClick={() => navigate('/simulaciones')}
            className="mt-2.5 w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shadow"
          >
            Ver simulador →
          </button>
        </div>
      </div>

      {/* Active Company & User Section */}
      <div className="p-3 border-t border-[#142742]/80 space-y-2">
        {/* Active Company Card */}
        <div className="bg-[#142742]/60 p-2.5 rounded-xl border border-white/5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 min-w-0">
              <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Empresa Activa</span>
                <span className="font-semibold text-white text-xs truncate block" title={activeCompany?.razonSocial}>
                  {activeCompany?.nombreComercial || activeCompany?.razonSocial || 'Sin empresa'}
                </span>
              </div>
            </div>
            {onOpenSwitchCompany && (
              <button
                onClick={onOpenSwitchCompany}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium px-2 py-0.5 rounded bg-blue-950/80 hover:bg-blue-900/80 transition-colors flex-shrink-0 ml-1"
              >
                Cambiar
              </button>
            )}
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-500 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white/10 flex-shrink-0">
              {getInitials(user?.nombreCompleto)}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{user?.nombreCompleto || 'Usuario'}</p>
              <p className="text-[10px] text-slate-400 truncate">{activeCompany?.rol?.nombre || 'Usuario'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
