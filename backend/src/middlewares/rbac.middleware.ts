import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error';

export function requirePermission(permisoRequerido: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Usuario no autenticado');
    }

    // Superadmin de plataforma tiene bypass de permisos si está actuando en ámbito global
    if (req.user.esSuperadmin) {
      return next();
    }

    if (!req.membership) {
      throw new ForbiddenError('No se ha establecido un contexto de membresía empresarial');
    }

    // El rol ADMIN_EMPRESARIAL tiene todos los permisos en su empresa
    if (req.membership.rolCodigo === 'ADMIN_EMPRESARIAL') {
      return next();
    }

    const tienePermiso = req.membership.permisos.includes(permisoRequerido);
    if (!tienePermiso) {
      throw new ForbiddenError(
        `Acceso denegado: Se requiere el permiso [${permisoRequerido}] para ejecutar esta acción`
      );
    }

    next();
  };
}

export function requireRole(rolesPermitidos: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Usuario no autenticado');
    }

    if (req.user.esSuperadmin) {
      return next();
    }

    if (!req.membership) {
      throw new ForbiddenError('No se ha establecido un contexto de membresía empresarial');
    }

    if (!rolesPermitidos.includes(req.membership.rolCodigo)) {
      throw new ForbiddenError(
        `Acceso denegado: Esta operación requiere uno de los siguientes roles: [${rolesPermitidos.join(', ')}]`
      );
    }

    next();
  };
}
