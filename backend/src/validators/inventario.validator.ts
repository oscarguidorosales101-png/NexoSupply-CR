import { z } from 'zod';

export const createRecepcionDetalleSchema = z.object({
  detalleOrdenId: z.string().uuid('ID de detalle de orden requerido'),
  productoId: z.string().uuid('ID de producto requerido'),
  cantidadRecibida: z.number().nonnegative('La cantidad recibida no puede ser negativa'),
  cantidadRechazada: z.number().nonnegative().default(0),
  motivoRechazo: z.string().optional(),
  costoUnitarioReal: z.number().nonnegative().default(0),
});

export const createRecepcionSchema = z.object({
  ordenCompraId: z.string().uuid('ID de orden de compra requerido'),
  almacenId: z.string().uuid('Almacén de recepción requerido'),
  numeroRecepcion: z.string().min(2, 'Número de recepción requerido'),
  numeroGuiaFactura: z.string().optional(),
  observaciones: z.string().optional(),
  detalles: z
    .array(createRecepcionDetalleSchema)
    .min(1, 'Debe incluir al menos un ítem a recepcionar en la entrega'),
});

export const createAjusteInventarioSchema = z.object({
  almacenId: z.string().uuid('Almacén requerido'),
  productoId: z.string().uuid('Producto requerido'),
  tipoMovimiento: z.enum(['ENTRADA_AJUSTE', 'SALIDA_AJUSTE']),
  cantidad: z.number().positive('La cantidad de ajuste debe ser estrictamente positiva'),
  motivo: z.string().min(5, 'Se requiere motivo o justificación técnica para el ajuste (RN-10)'),
});

export const createAlmacenSchema = z.object({
  codigo: z.string().min(2, 'Código de almacén requerido'),
  nombre: z.string().min(2, 'Nombre de almacén requerido'),
  ubicacion: z.string().optional(),
  responsable: z.string().optional(),
  esPrincipal: z.boolean().default(false),
  activo: z.boolean().default(true),
});
