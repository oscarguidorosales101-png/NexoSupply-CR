import { z } from 'zod';

export const createSolicitudDetalleSchema = z.object({
  productoId: z.string().uuid('ID de producto requerido'),
  cantidadSolicitada: z.number().positive('La cantidad debe ser mayor a cero'),
  precioUnitarioEstimado: z.number().nonnegative().default(0),
  observaciones: z.string().optional(),
});

export const createSolicitudSchema = z.object({
  numeroSolicitud: z.string().min(2, 'Número de solicitud requerido'),
  justificacion: z.string().min(5, 'Justificación formal requerida'),
  moneda: z.enum(['CRC', 'USD']).default('CRC'),
  detalles: z
    .array(createSolicitudDetalleSchema)
    .min(1, 'La solicitud de compra debe contener al menos un producto (RN-03)'),
});

export const decideAprobacionSchema = z.object({
  decision: z.enum(['APROBADA', 'RECHAZADA']),
  comentario: z.string().optional(),
});

export const createOrdenDirectaSchema = z.object({
  solicitudOrigenId: z.string().uuid().optional().nullable(),
  proveedorId: z.string().uuid('Proveedor requerido'),
  almacenDestinoId: z.string().uuid('Almacén de destino requerido'),
  numeroOrden: z.string().min(2, 'Número de orden requerido'),
  fechaPrometidaEntrega: z.string().datetime(),
  moneda: z.enum(['CRC', 'USD']).default('CRC'),
  tasaCambio: z.number().positive().default(1.0),
  condicionesPago: z.string().optional(),
  notas: z.string().optional(),
  detalles: z
    .array(
      z.object({
        productoId: z.string().uuid(),
        cantidadOrdenada: z.number().positive('Cantidad debe ser mayor a 0'),
        precioUnitario: z.number().positive('Precio unitario debe ser mayor a 0'),
        porcentajeDescuento: z.number().min(0).max(100).default(0),
        impuestoPorcentaje: z.number().min(0).max(100).default(13.0),
      })
    )
    .min(1, 'La orden de compra debe contener al menos un producto'),
});
