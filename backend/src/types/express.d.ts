import { PermisoCodigo, RolCodigo } from '../constants/roles';

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombreCompleto: string;
  esSuperadmin: boolean;
}

export interface TenantContext {
  id: string;
  rfcCedula: string;
  razonSocial: string;
  monedaBase: string;
  activa: boolean;
}

export interface MembershipContext {
  id: string;
  rolId: string;
  rolCodigo: string;
  permisos: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenant?: TenantContext;
      membership?: MembershipContext;
    }
  }
}
