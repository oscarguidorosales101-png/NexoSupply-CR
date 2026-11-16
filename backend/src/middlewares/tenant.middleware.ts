import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../errors/app-error';
import { prisma } from '../config/database';

export async function requireTenant(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Se requiere usuario autenticado antes de establecer contexto empresarial');
    }

    // Obtener empresaId desde cabecera X-Empresa-Id, parámetro de ruta o query
    const rawHeader = req.headers['x-empresa-id'];
    const headerEmpresaId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const rawParam = req.params.empresaId;
    const paramEmpresaId = Array.isArray(rawParam) ? rawParam[0] : rawParam;

    let empresaId = headerEmpresaId || paramEmpresaId || (req.query.empresaId as string);

    // Si no se proporcionó en cabecera ni parámetro, buscar si tiene una membresía activa por defecto
    if (!empresaId) {
      const primeraMembresia = await prisma.membresiaEmpresa.findFirst({
        where: { usuario_id: req.user.id, activa: true, empresa: { activa: true } },
        select: { empresa_id: true },
      });

      if (!primeraMembresia) {
        throw new ForbiddenError('El usuario no posee membresías activas en ninguna empresa');
      }
      empresaId = primeraMembresia.empresa_id;
    }

    // Validar existencia y estado de la empresa en MySQL
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        rfc_cedula: true,
        razon_social: true,
        moneda_base: true,
        activa: true,
      },
    });

    if (!empresa) {
      throw new NotFoundError('La empresa solicitada no existe');
    }

    if (!empresa.activa) {
      throw new ForbiddenError('La empresa solicitada se encuentra suspendida o inactiva');
    }

    // Validar membresía del usuario en la empresa
    const membresia = await prisma.membresiaEmpresa.findUnique({
      where: {
        uk_usuario_empresa: {
          usuario_id: req.user.id,
          empresa_id: empresa.id,
        },
      },
      include: {
        rol: {
          include: {
            roles_permisos: {
              include: {
                permiso: true,
              },
            },
          },
        },
      },
    });

    if (!membresia || !membresia.activa) {
      throw new ForbiddenError('Acceso denegado: No cuenta con una membresía activa en esta empresa');
    }

    // Inyectar contexto multi-tenant seguro en el Request
    req.tenant = {
      id: empresa.id,
      rfcCedula: empresa.rfc_cedula,
      razonSocial: empresa.razon_social,
      monedaBase: empresa.moneda_base,
      activa: empresa.activa,
    };

    const permisos = membresia.rol.roles_permisos.map((rp) => rp.permiso.codigo);

    req.membership = {
      id: membresia.id,
      rolId: membresia.rol.id,
      rolCodigo: membresia.rol.codigo,
      permisos,
    };

    next();
  } catch (error) {
    next(error);
  }
}
