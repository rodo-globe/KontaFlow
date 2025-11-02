import { z } from 'zod';

/**
 * Configuración de la aplicación
 *
 * Todas las variables de entorno son validadas con Zod
 * para asegurar type-safety y valores correctos.
 */

const configSchema = z.object({
  // Entorno
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Servidor
  PORT: z.string().transform(Number).default('8000'),
  HOST: z.string().default('0.0.0.0'),

  // Base de datos
  DATABASE_URL: z.string().url(),

  // Autenticación (Clerk)
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // Storage (MinIO/S3)
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

// Parsear y validar variables de entorno
const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
  console.error('❌ Error en configuración de variables de entorno:');
  console.error(parsedConfig.error.format());
  process.exit(1);
}

export const config = parsedConfig.data;

/**
 * Helper para verificar si estamos en desarrollo
 */
export const isDevelopment = config.NODE_ENV === 'development';

/**
 * Helper para verificar si estamos en producción
 */
export const isProduction = config.NODE_ENV === 'production';

/**
 * Helper para verificar si estamos en test
 */
export const isTest = config.NODE_ENV === 'test';

/**
 * Configuración de CORS
 */
export const corsOptions = {
  origin: config.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  credentials: true,
};

/**
 * Configuración de rate limiting
 */
export const rateLimitOptions = {
  max: isDevelopment ? 1000 : 100, // Más permisivo en desarrollo
  timeWindow: '1 minute',
};

export default config;
