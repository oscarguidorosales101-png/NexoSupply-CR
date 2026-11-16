import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { Building2, Check } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [isSwitchCompanyOpen, setIsSwitchCompanyOpen] = useState(false);
  const { activeCompany, availableCompanies, switchCompany } = useAuth();

  const handleSelectCompany = async (id: string) => {
    setIsSwitchCompanyOpen(false);
    if (id !== activeCompany?.id) {
      await switchCompany(id);
      window.location.reload();
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden antialiased">
      {/* Sidebar */}
      <Sidebar onOpenSwitchCompany={() => setIsSwitchCompanyOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onOpenSwitchCompany={() => setIsSwitchCompanyOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* Modal para Cambiar de Empresa */}
      <Modal
        isOpen={isSwitchCompanyOpen}
        onClose={() => setIsSwitchCompanyOpen(false)}
        title="Cambiar de Empresa"
        subtitle="Selecciona la empresa con la que deseas operar en esta sesión."
      >
        <div className="space-y-2 mt-2">
          {availableCompanies.map((emp) => {
            const isCurrent = emp.id === activeCompany?.id;
            return (
              <div
                key={emp.id}
                onClick={() => handleSelectCompany(emp.id)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{emp.razonSocial}</h4>
                    <p className="text-xs text-slate-500">Rol: {emp.rol}</p>
                  </div>
                </div>
                {isCurrent && <Check className="w-5 h-5 text-blue-600 font-bold" />}
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};
