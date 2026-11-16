import { z } from 'zod';

export const updateEmpresaSchema = z.object({
  razonSocial: z.string().min(3).optional(),
  nombreComercial: z.string().min(2).optional(),
  emailContacto: z.string().email().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  temaVisual: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

export const updateConfiguracionSchema = z.object({
  montoMaxAutoaprobacion: z.number().nonnegative().optional(),
  toleranciaSobrentregaPorc: z.number().min(0).max(100).optional(),
  diasCreditoDefault: z.number().int().positive().optional(),
  notificarAlertasStock: z.boolean().optional(),
  notificarRetrasos: z.boolean().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Correo de invitación no válido'),
  rolId: z.string().uuid('ID de rol no válido'),
});
