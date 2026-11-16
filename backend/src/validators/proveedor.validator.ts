import { z } from 'zod';

export const createProveedorSchema = z.object({
  identificadorFiscal: z.string().min(5, 'Cédula o Tax ID requerido'),
  nombreLegal: z.string().min(3, 'Razón social requerida'),
  nombreFantasia: z.string().optional(),
  clasificacion: z.enum(['A', 'B', 'C']).default('B'),
  terminosPagoDias: z.number().int().nonnegative().default(30),
  monedaPreferida: z.enum(['CRC', 'USD']).default('CRC'),
  leadTimePromedioDias: z.number().int().positive().default(7),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  activo: z.boolean().default(true),
});

export const updateProveedorSchema = createProveedorSchema.partial();

export const createContactoSchema = z.object({
  nombre: z.string().min(2, 'Nombre del contacto requerido'),
  cargo: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  esPrincipal: z.boolean().default(false),
});
