import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  nombreCompleto: string;
  esSuperadmin: boolean;
}

export interface ActiveCompany {
  id: string;
  rfcCedula: string;
  razonSocial: string;
  nombreComercial: string;
  monedaBase: string;
  temaVisual: string;
  rol: {
    codigo: string;
    nombre: string;
    permisos: string[];
  };
}

export interface AvailableCompany {
  id: string;
  razonSocial: string;
  nombreComercial: string;
  rol: string;
}

export interface LoginResponse {
  accessToken: string;
  usuario: User;
  empresaActiva: ActiveCompany | null;
  empresasDisponibles: AvailableCompany[];
}

export async function login(email: string, password: string, empresaId?: string): Promise<LoginResponse> {
  return await apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, empresaId }),
  });
}

export async function register(data: any): Promise<any> {
  return await apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<{ message: string }> {
  return await apiClient('/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<{
  usuario: User;
  empresaActiva: ActiveCompany | null;
  empresasDisponibles: AvailableCompany[];
}> {
  return await apiClient('/auth/me', { method: 'GET' });
}

export async function switchTenant(empresaId: string): Promise<{
  accessToken: string;
  empresaActiva: ActiveCompany;
}> {
  return await apiClient('/auth/switch-tenant', {
    method: 'POST',
    body: JSON.stringify({ empresaId }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<any> {
  return await apiClient('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
