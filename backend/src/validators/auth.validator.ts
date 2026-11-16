import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('El formato del correo electrónico no es válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  empresaId: z.string().uuid().optional(),
});

export const registerSchema = z.object({
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nombreCompleto: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres'),
  telefono: z.string().optional(),
  // Datos iniciales de la empresa a crear (si es auto-registro)
  empresa: z
    .object({
      rfcCedula: z.string().min(5, 'Cédula jurídica o fiscal requerida'),
      razonSocial: z.string().min(3, 'Razón social requerida'),
      nombreComercial: z.string().min(2, 'Nombre comercial requerido'),
      emailContacto: z.string().email('Correo de contacto de la empresa no válido'),
      telefono: z.string().optional(),
      direccion: z.string().optional(),
      monedaBase: z.enum(['CRC', 'USD']).default('CRC'),
    })
    .optional(),
});

export const switchTenantSchema = z.object({
  empresaId: z.string().uuid('El ID de la empresa debe ser un UUID válido'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});
