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
  DEEPSEEK_API_KEY: z.string().optional().default(''),
  DEEPSEEK_MODEL: z.string().optional().default('deepseek-chat'),
  DEEPSEEK_BASE_URL: z.string().optional().default('https://api.deepseek.com'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional().default('../nexosupply-cr-209e6cfebcda (1).json'),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().optional().default(''),
  GOOGLE_DRIVE_SYNC_ENABLED: z.string().default('true').transform((val) => val === 'true'),
  GOOGLE_DRIVE_SYNC_INTERVAL: z.string().default('5').transform((val) => parseInt(val, 10)),
  QDRANT_URL: z.string().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional().default(''),
  EMBEDDING_PROVIDER: z.string().default('local'),
  EMBEDDING_MODEL: z.string().default('local-semantic-384'),
  RAG_CHUNK_SIZE: z.string().default('750').transform((val) => parseInt(val, 10)),
  RAG_CHUNK_OVERLAP: z.string().default('100').transform((val) => parseInt(val, 10)),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.string().optional().default(''),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('noreply@nexosupply.cr'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_REDIRECT_URI: z.string().optional().default('http://localhost:4000/api/v1/auth/google/callback'),
  GOOGLE_OAUTH_OWNER_EMAIL: z.string().optional().default('oscarguidorosales101@gmail.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missingOrInvalid = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
  console.error(`[FATAL] Configuración de entorno inválida o incompleta: ${missingOrInvalid}`);
  process.exit(1);
}

export const env = parsed.data;
