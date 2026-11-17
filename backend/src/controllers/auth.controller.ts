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
import { googleDriveOAuthService } from '../services/google-drive-oauth.service';
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

export async function googleOAuthCallbackHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  const frontendBase = env.CORS_ORIGIN || 'http://localhost:5173';
  console.log('[OAUTH-CALLBACK] Recibida respuesta de Google. Code:', code ? 'PRESENTE' : 'AUSENTE', 'State:', state ? 'PRESENTE' : 'AUSENTE', 'Error:', error || 'NINGUNO');

  if (error) {
    console.error('[OAUTH-CALLBACK] Error devuelto por Google:', error);
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><title>Error de Autorización - NexoSupply CR</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;}.card{background:#fff;padding:2rem;border-radius:12px;box-shadow:0 4px 6px rgb(0 0 0/0.1);max-width:440px;text-align:center;border:1px solid #fee2e2;}h1{color:#991b1b;font-size:1.3rem;}p{color:#475569;font-size:0.95rem;line-height:1.5;}.btn{display:inline-block;background:#2563eb;color:#fff;padding:0.6rem 1.2rem;border-radius:8px;text-decoration:none;margin-top:1rem;font-weight:500;}</style>
      </head>
      <body><div class="card"><h1>Error de Autorización Google</h1><p>${error}</p><a href="${frontendBase}/dashboard" class="btn">Volver a la Plataforma</a></div></body>
      </html>
    `);
    return;
  }

  if (!code || !state) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><title>Error - Parámetros Faltantes</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;}.card{background:#fff;padding:2rem;border-radius:12px;box-shadow:0 4px 6px rgb(0 0 0/0.1);max-width:440px;text-align:center;border:1px solid #fee2e2;}h1{color:#991b1b;font-size:1.3rem;}p{color:#475569;font-size:0.95rem;line-height:1.5;}.btn{display:inline-block;background:#2563eb;color:#fff;padding:0.6rem 1.2rem;border-radius:8px;text-decoration:none;margin-top:1rem;font-weight:500;}</style>
      </head>
      <body><div class="card"><h1>Parámetros Faltantes</h1><p>No se recibieron el código de autorización ni el estado requerido por Google.</p><a href="${frontendBase}/dashboard" class="btn">Volver a la Plataforma</a></div></body>
      </html>
    `);
    return;
  }

  try {
    const result = await googleDriveOAuthService.handleCallback(code, state);
    console.log('[OAUTH-CALLBACK] Autorización exitosa registrada para:', result.email);
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><title>Google Drive Conectado - NexoSupply CR</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
        .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 480px; text-align: center; border: 1px solid #e2e8f0; }
        h1 { color: #0f172a; font-size: 1.5rem; margin-bottom: 0.75rem; }
        p { color: #475569; line-height: 1.5; margin-bottom: 1.5rem; font-size: 0.95rem; }
        .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: 600; padding: 0.35rem 0.75rem; border-radius: 9999px; margin-bottom: 1rem; border: 1px solid #a7f3d0; font-size: 0.85rem; }
        .btn { display: inline-block; background: #2563eb; color: white; padding: 0.65rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 500; }
      </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Autorización Exitosa</div>
          <h1>Google Drive Conectado</h1>
          <p>La cuenta <strong>${result.email}</strong> fue autorizada correctamente para almacenar y sincronizar documentos en <strong>NexoSupply-Root</strong>.</p>
          <a href="${frontendBase}/dashboard" class="btn">Volver a la Plataforma</a>
        </div>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error('[OAUTH-CALLBACK] Error procesando callback:', err.message);
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><title>Error de Verificación OAuth - NexoSupply CR</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
        .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 480px; text-align: center; border: 1px solid #fee2e2; }
        h1 { color: #991b1b; font-size: 1.5rem; margin-bottom: 0.75rem; }
        p { color: #475569; line-height: 1.5; margin-bottom: 1.5rem; font-size: 0.95rem; }
        .msg { background: #fef2f2; color: #b91c1c; padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; margin-bottom: 1.5rem; word-break: break-word; }
        .btn { display: inline-block; background: #2563eb; color: white; padding: 0.65rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 500; }
      </style>
      </head>
      <body>
        <div class="card">
          <h1>Error en la Autorización</h1>
          <div class="msg">${err.message || 'Error durante la verificación OAuth de Google'}</div>
          <p>Asegúrese de autorizar la cuenta del propietario configurado (<strong>${env.GOOGLE_OAUTH_OWNER_EMAIL || 'oscarguidorosales101@gmail.com'}</strong>).</p>
          <a href="${frontendBase}/dashboard" class="btn">Volver a la Plataforma</a>
        </div>
      </body>
      </html>
    `);
  }
}
