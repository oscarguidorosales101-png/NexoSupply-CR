import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  ActiveCompany,
  AvailableCompany,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  switchTenant as apiSwitchTenant,
} from '../api/auth.api';
import { setActiveTenantHeader, setOnUnauthorized } from '../api/client';

interface AuthContextType {
  user: User | null;
  activeCompany: ActiveCompany | null;
  availableCompanies: AvailableCompany[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, empresaId?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (empresaId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeCompany, setActiveCompany] = useState<ActiveCompany | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<AvailableCompany[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getMe();
      setUser(res.usuario);
      setActiveCompany(res.empresaActiva);
      setAvailableCompanies(res.empresasDisponibles || []);

      if (res.empresaActiva?.id) {
        setActiveTenantHeader(res.empresaActiva.id);
        localStorage.setItem('active_empresa_id', res.empresaActiva.id);
      }
    } catch {
      setUser(null);
      setActiveCompany(null);
      setAvailableCompanies([]);
      setActiveTenantHeader(null);
      localStorage.removeItem('active_empresa_id');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Interceptor cuando una llamada retorna 401
    setOnUnauthorized(() => {
      setUser(null);
      setActiveCompany(null);
      setActiveTenantHeader(null);
      localStorage.removeItem('active_empresa_id');
    });

    initAuth();
  }, [initAuth]);

  const login = async (email: string, password: string, empresaId?: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin(email, password, empresaId);
      setUser(res.usuario);
      setActiveCompany(res.empresaActiva);
      setAvailableCompanies(res.empresasDisponibles || []);

      if (res.empresaActiva?.id) {
        setActiveTenantHeader(res.empresaActiva.id);
        localStorage.setItem('active_empresa_id', res.empresaActiva.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.warn('Error en logout:', err);
    } finally {
      setUser(null);
      setActiveCompany(null);
      setAvailableCompanies([]);
      setActiveTenantHeader(null);
      localStorage.removeItem('active_empresa_id');
    }
  };

  const switchCompany = async (empresaId: string) => {
    setIsLoading(true);
    try {
      const res = await apiSwitchTenant(empresaId);
      setActiveCompany(res.empresaActiva);
      setActiveTenantHeader(res.empresaActiva.id);
      localStorage.setItem('active_empresa_id', res.empresaActiva.id);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.esSuperadmin) return true;
    if (!activeCompany || !activeCompany.rol) return false;
    return activeCompany.rol.permisos.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeCompany,
        availableCompanies,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchCompany,
        hasPermission,
        refreshSession: initAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
