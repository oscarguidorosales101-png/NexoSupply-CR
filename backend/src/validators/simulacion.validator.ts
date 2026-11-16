import { z } from 'zod';

export const runSimulacionSchema = z.object({
  nombreEscenario: z.string().min(3, 'Nombre del escenario de simulación requerido'),
  descripcion: z.string().optional(),
  proveedorAfectadoId: z.string().uuid('ID de proveedor crítico afectado requerido'),
  diasRetrasoSimulados: z.number().int().positive('Los días de retraso deben ser mayores a cero'),
});
