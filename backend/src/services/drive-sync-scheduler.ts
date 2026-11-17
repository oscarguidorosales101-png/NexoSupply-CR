import { env } from '../config/env';
import { prisma } from '../config/database';
import { ragService } from './rag.service';
import { centralDocumentSyncService } from './central-document-sync.service';

export class DriveSyncScheduler {
  private intervalTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  public start(): void {
    if (!env.GOOGLE_DRIVE_SYNC_ENABLED) {
      console.log('[SCHEDULER] Sincronización automática de Google Drive desactivada por configuración.');
      return;
    }

    const intervalMinutes = Math.max(env.GOOGLE_DRIVE_SYNC_INTERVAL || 5, 1);
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`[SCHEDULER] Programador de sincronización documental iniciado (cada ${intervalMinutes} minutos).`);

    // Iniciar intervalo periódico
    this.intervalTimer = setInterval(() => {
      this.runIncrementalSync().catch((err) => {
        console.error('[SCHEDULER] Error en ciclo programado de sincronización:', err.message);
      });
    }, intervalMs);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
      console.log('[SCHEDULER] Programador de sincronización detenido.');
    }
  }

  /**
   * Ejecuta el ciclo de sincronización incremental para todas las empresas activas
   */
  public async runIncrementalSync(): Promise<void> {
    if (this.isRunning) {
      console.log('[SCHEDULER] Ciclo de sincronización previo aún en ejecución. Omitiendo turno.');
      return;
    }

    this.isRunning = true;
    try {
      const empresas = await prisma.empresa.findMany({
        where: { activa: true },
        select: { id: true, razon_social: true },
      });

      for (const emp of empresas) {
        try {
          // 1. Ejecutar generación y Outbox documental para todas las 29 carpetas
          await centralDocumentSyncService.executeFullSync(emp.id);
          // 2. Procesar pipeline RAG e indexación
          await ragService.syncAndIndexEnterprise(emp.id);
        } catch (err: any) {
          console.warn(`[SCHEDULER] Error en sincronización de ${emp.razon_social}:`, err.message);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}

export const driveSyncScheduler = new DriveSyncScheduler();
