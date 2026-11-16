import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria para conectar con MySQL 8'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres de entropía'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_REFRESH_SECRET: z.string().default('nexosupply_refresh_dev_secret_key_9988776655'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AI_API_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missingOrInvalid = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
  console.error(`[FATAL] Configuración de entorno inválida o incompleta: ${missingOrInvalid}`);
  process.exit(1);
}

export const env = parsed.data;
