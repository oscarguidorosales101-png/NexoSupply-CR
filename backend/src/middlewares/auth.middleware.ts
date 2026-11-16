import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../errors/app-error';
import { prisma } from '../config/database';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && (req.cookies.token || req.cookies.access_token)) {
      token = req.cookies.token || req.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedError('Encabezado o cookie de autenticación no proporcionado');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Token de sesión inválido o expirado');
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        nombre_completo: true,
        es_superadmin: true,
        activo: true,
      },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedError('La cuenta de usuario no existe o se encuentra inactiva');
    }

    req.user = {
      id: usuario.id,
      email: usuario.email,
      nombreCompleto: usuario.nombre_completo,
      esSuperadmin: usuario.es_superadmin,
    };

    next();
  } catch (error) {
    next(error);
  }
}
