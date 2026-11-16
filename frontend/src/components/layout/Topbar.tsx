import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Building2,
  ChevronDown,
  Check,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listAlertas, AlertaRiesgo } from '../../api/riesgos.api';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onOpenSwitchCompany?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenSwitchCompany }) => {
  const { user, activeCompany, availableCompanies, switchCompany } = useAuth();
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);
  const [alerts, setAlerts] = useState<AlertaRiesgo[]>([]);
  const companyMenuRef = useRef<HTMLDivElement>(null);
  const alertsMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Cargar alertas activas para el badge
    if (activeCompany) {
      listAlertas({ resuelta: false })
        .then((res) => setAlerts(res.slice(0, 5)))
        .catch(() => setAlerts([]));
    }
  }, [activeCompany]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(e.target as Node)) {
        setShowCompanyMenu(false);
      }
      if (alertsMenuRef.current && !alertsMenuRef.current.contains(e.target as Node)) {
        setShowAlertsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCompany = async (empresaId: string) => {
    setShowCompanyMenu(false);
    if (empresaId !== activeCompany?.id) {
      await switchCompany(empresaId);
      window.location.reload();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AD';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-6 flex items-center justify-between">
      {/* Left: Enterprise Selector Dropdown */}
      <div className="flex items-center space-x-4">
        <div className="relative" ref={companyMenuRef}>
          <button
            onClick={() => setShowCompanyMenu(!showCompanyMenu)}
            className="flex items-center space-x-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold transition-colors"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="max-w-[220px] truncate">
              {activeCompany?.razonSocial || 'Seleccionar Empresa'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showCompanyMenu && (
            <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mis Empresas Disponibles
              </div>
              <div className="max-h-60 overflow-y-auto">
                {availableCompanies.map((emp) => {
                  const isCurrent = emp.id === activeCompany?.id;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => handleSelectCompany(emp.id)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50 text-xs transition-colors ${
                        isCurrent ? 'bg-blue-50/70 text-blue-700 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium text-slate-900 truncate">{emp.razonSocial}</div>
                        <div className="text-[11px] text-slate-500">{emp.rol}</div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-lg mx-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en el sistema (productos, órdenes, proveedores)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-slate-700"
          />
        </div>
      </div>

      {/* Right: Date filter pill, Notifications & User Avatar */}
      <div className="flex items-center space-x-3.5">
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Últimos 30 días</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={alertsMenuRef}>
          <button
            onClick={() => setShowAlertsMenu(!showAlertsMenu)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
            title="Alertas activas"
          >
            <Bell className="w-5 h-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {alerts.length}
              </span>
            )}
          </button>

          {showAlertsMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Alertas Operativas ({alerts.length})
                </span>
                <button
                  onClick={() => {
                    setShowAlertsMenu(false);
                    navigate('/riesgos');
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver todas
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {alerts.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500 text-center">No hay alertas pendientes</p>
                ) : (
                  alerts.map((al) => (
                    <div
                      key={al.id}
                      onClick={() => {
                        setShowAlertsMenu(false);
                        navigate('/riesgos');
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{al.titulo}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{al.mensaje}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-100">
            {getInitials(user?.nombreCompleto)}
          </div>
          <div className="hidden sm:block text-left">
            <span className="text-xs font-semibold text-slate-800 block leading-tight">
              {user?.nombreCompleto?.split(' ')[0] || 'Admin'}
            </span>
            <span className="text-[10px] text-slate-500 block leading-tight">
              {activeCompany?.rol?.nombre || 'Administrador'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
