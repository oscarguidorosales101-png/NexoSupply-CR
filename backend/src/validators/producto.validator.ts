import { z } from 'zod';

export const createProductoSchema = z.object({
  sku: z.string().min(2, 'SKU obligatorio'),
  codigoBarras: z.string().optional(),
  nombre: z.string().min(2, 'Nombre del producto requerido'),
  descripcion: z.string().optional(),
  categoriaId: z.string().uuid().optional().nullable(),
  unidadMedidaId: z.string().uuid('Unidad de medida obligatoria'),
  costoPromedio: z.number().nonnegative().default(0),
  precioReferencia: z.number().nonnegative().default(0),
  stockMinimoGlobal: z.number().nonnegative().default(0),
  stockSeguridad: z.number().nonnegative().default(0),
  activo: z.boolean().default(true),
});

export const updateProductoSchema = createProductoSchema.partial();

export const linkProductoProveedorSchema = z.object({
  proveedorId: z.string().uuid('ID de proveedor requerido'),
  codigoProductoProveedor: z.string().optional(),
  precioUnitarioAcordado: z.number().positive('El precio acordado debe ser mayor a cero'),
  moneda: z.enum(['CRC', 'USD']).default('CRC'),
  diasEntregaEsperados: z.number().int().positive().default(7),
  esPreferido: z.boolean().default(false),
});

export const createCategoriaSchema = z.object({
  codigo: z.string().min(2, 'Código de categoría requerido'),
  nombre: z.string().min(2, 'Nombre de categoría requerido'),
  descripcion: z.string().optional(),
});

export const createUnidadMedidaSchema = z.object({
  codigo: z.string().min(1, 'Código requerido'),
  nombre: z.string().min(2, 'Nombre requerido'),
  simbolo: z.string().min(1, 'Símbolo requerido'),
});
