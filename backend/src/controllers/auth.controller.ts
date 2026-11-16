import { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  verifyEmailCodeService,
  resendVerificationCodeService,
  loginUser,
  switchTenantService,
  getAuthenticatedUserProfile,
  changePasswordService,
} from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';

export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await registerUser(req.body);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function verifyEmailHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, code } = req.body;
    const result = await verifyEmailCodeService(email, code);

    if (result.accessToken) {
      res.cookie('token', result.accessToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000,
      });
    }

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function resendCodeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    const result = await resendVerificationCodeService(email);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, empresaId } = req.body;
    const result = await loginUser(email, password, empresaId);

    // Configurar cookie HttpOnly segura
    res.cookie('token', result.accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 horas
    });

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function logoutHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    sendSuccess(res, { message: 'Sesión cerrada exitosamente' }, 200);
  } catch (error) {
    next(error);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const empresaId = req.headers['x-empresa-id'] as string;
    const profile = await getAuthenticatedUserProfile(req.user!.id, empresaId);
    sendSuccess(res, profile, 200);
  } catch (error) {
    next(error);
  }
}

export async function switchTenantHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { empresaId } = req.body;
    const result = await switchTenantService(req.user!.id, empresaId);

    res.cookie('token', result.accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });

    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function changePasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await changePasswordService(req.user!.id, currentPassword, newPassword);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}
