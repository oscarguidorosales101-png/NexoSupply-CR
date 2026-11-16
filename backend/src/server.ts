import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 NexoSupply CR Backend escuchando en el puerto ${env.PORT}`);
    console.log(`📡 URL Base: http://localhost:${env.PORT}/api/v1`);
    console.log(`🔍 Health Check: http://localhost:${env.PORT}/health`);
    console.log(`🛡️  Modo: ${env.NODE_ENV}`);
    console.log(`=======================================================`);
  });

  // Cierre limpio (Graceful Shutdown)
  const shutdown = async (signal: string) => {
    console.log(`\n[SHUTDOWN] Señal ${signal} recibida. Cerrando conexiones de forma segura...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('✓ Servidor HTTP detenido y recursos liberados');
      process.exit(0);
    });

    // Forzar cierre si no responde en 10 segundos
    setTimeout(() => {
      console.error('[FATAL] No se pudo cerrar ordenadamente a tiempo. Forzando terminación.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[BOOTSTRAP_ERROR] Error al inicializar el servidor:', err);
  process.exit(1);
});
