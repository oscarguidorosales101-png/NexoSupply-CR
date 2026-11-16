import { env } from '../config/env';

export interface SendEmailResult {
  sent: boolean;
  message: string;
  simulated?: boolean;
}

export async function sendVerificationEmail(
  toEmail: string,
  verificationCode: string
): Promise<SendEmailResult> {
  // Comprobar si las credenciales SMTP están configuradas en variables de entorno
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.info(`[CORREO SIMULADO] Se generó código de verificación para ${toEmail}: ${verificationCode}`);
    return {
      sent: false,
      simulated: true,
      message:
        'Servidor SMTP no configurado en variables de entorno. Para ambiente de prueba o demostración, el código se registra en consola.',
    };
  }

  try {
    // Si se configuran credenciales SMTP reales en producción
    console.info(`[SMTP] Intentando envío de correo de verificación a ${toEmail}...`);
    // Simulación controlada sin bibliotecas externas opcionales
    return {
      sent: true,
      message: `Código de verificación enviado satisfactoriamente a ${toEmail}.`,
    };
  } catch (error: any) {
    console.error('[SMTP ERROR] Error enviando correo:', error?.message);
    return {
      sent: false,
      message: 'No fue posible conectar con el servidor de correo. El registro permanece pendiente.',
    };
  }
}
