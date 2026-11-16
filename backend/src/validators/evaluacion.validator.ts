import { z } from 'zod';

export const createIncidenciaSchema = z.object({
  proveedorId: z.string().uuid('ID de proveedor requerido'),
  ordenCompraId: z.string().uuid().optional().nullable(),
  recepcionId: z.string().uuid().optional().nullable(),
  tipoIncidencia: z.enum([
    'RETRASO',
    'FALTANTE',
    'PRODUCTO_DEFECTUOSO',
    'PRECIO_DISCREPANCIA',
    'DOCUMENTACION_INCORRECTA',
  ]),
  severidad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']).default('MEDIA'),
  descripcion: z.string().min(5, 'Descripción detallada de la incidencia requerida'),
  costoImpactoEstimado: z.number().nonnegative().default(0),
});

export const resolverIncidenciaSchema = z.object({
  solucionAplicada: z.string().min(5, 'Descripción de la solución aplicada requerida'),
});

export const runEvaluacionSchema = z.object({
  proveedorId: z.string().uuid('ID de proveedor requerido'),
  periodo: z.string().min(4, 'Periodo requerido (ej. 2026-11 o 2026-T1)'),
});
