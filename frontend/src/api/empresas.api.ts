import { apiClient } from './client';

export async function getCompanyProfile(): Promise<any> {
  return await apiClient('/empresas/profile');
}

export async function updateCompanyProfile(data: any): Promise<any> {
  return await apiClient('/empresas/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function updateCompanyConfig(data: any): Promise<any> {
  return await apiClient('/empresas/configuracion', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function listMembers(): Promise<any[]> {
  return await apiClient('/empresas/members');
}

export async function inviteMember(email: string, rolId: string): Promise<any> {
  return await apiClient('/empresas/members/invite', {
    method: 'POST',
    body: JSON.stringify({ email, rolId }),
  });
}

export async function listRolesAndPermissions(): Promise<{ roles: any[]; permisos: any[] }> {
  return await apiClient('/empresas/roles-permisos');
}
