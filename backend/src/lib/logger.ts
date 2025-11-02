import pino from 'pino';

/**
 * Logger configurado con Pino
 *
 * Features:
 * - JSON estructurado en producción
 * - Pretty print en desarrollo
 * - Niveles: trace, debug, info, warn, error, fatal
 * - Contexto por request
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Pretty print en desarrollo
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,

  // Configuración base
  base: {
    env: process.env.NODE_ENV || 'development',
  },

  // Serializers personalizados
  serializers: {
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        userAgent: req.headers['user-agent'],
      },
      remoteAddress: req.ip,
      remotePort: req.socket?.remotePort,
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },

  // Timestamp en formato ISO
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

/**
 * Helper para crear logger con contexto
 */
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Helper para log de requests HTTP
 */
export function logRequest(method: string, url: string, statusCode: number, duration: number) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger[level]({
    type: 'http',
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
  });
}

/**
 * Helper para log de errores
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error({
    type: 'error',
    err: error,
    ...context,
  });
}

/**
 * Helper para log de queries de base de datos (desarrollo)
 */
export function logQuery(query: string, duration: number, params?: any[]) {
  if (isDevelopment) {
    logger.debug({
      type: 'database',
      query,
      params,
      duration: `${duration}ms`,
    });
  }
}

export default logger;
