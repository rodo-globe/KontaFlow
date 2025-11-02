import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import {
  AppError,
  isOperationalError,
  handlePrismaError,
  handleZodError,
} from '../lib/errors';
import { logError, logger } from '../lib/logger';
import { isDevelopment } from '../lib/config';

/**
 * Middleware para manejo centralizado de errores
 *
 * Captura todos los errores de la aplicación y los transforma
 * en respuestas HTTP apropiadas.
 */
export async function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // 1. Errores operacionales (AppError y derivados)
  if (error instanceof AppError) {
    const response: any = {
      error: {
        code: error.code,
        message: error.message,
      },
    };

    // Agregar detalles adicionales si existen
    if ('details' in error) {
      response.error.details = (error as any).details;
    }
    if ('field' in error) {
      response.error.field = (error as any).field;
    }
    if ('rule' in error) {
      response.error.rule = (error as any).rule;
    }

    // Log según severidad
    if (error.statusCode >= 500) {
      logError(error, {
        url: request.url,
        method: request.method,
        userId: (request as any).user?.id,
      });
    } else {
      logger.warn({
        type: 'operational_error',
        code: error.code,
        message: error.message,
        url: request.url,
        method: request.method,
      });
    }

    return reply.code(error.statusCode).send(response);
  }

  // 2. Errores de validación de Zod
  if (error instanceof ZodError) {
    const validationError = handleZodError(error);

    logger.warn({
      type: 'validation_error',
      errors: validationError,
      url: request.url,
      method: request.method,
    });

    return reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: validationError.message,
        details: (validationError as any).details,
      },
    });
  }

  // 3. Errores de Prisma
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    const prismaError = handlePrismaError(error);

    logError(error, {
      url: request.url,
      method: request.method,
      prismaCode: (error as any).code,
    });

    return reply.code(prismaError.statusCode).send({
      error: {
        code: prismaError.code,
        message: prismaError.message,
      },
    });
  }

  // 4. Errores de Fastify (404, etc.)
  if ('statusCode' in error) {
    const fastifyError = error as FastifyError;

    if (fastifyError.statusCode === 404) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint no encontrado',
        },
      });
    }

    if (fastifyError.statusCode === 413) {
      return reply.code(413).send({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'El archivo o payload es demasiado grande',
        },
      });
    }
  }

  // 5. Errores no esperados (500)
  logError(error, {
    url: request.url,
    method: request.method,
    userId: (request as any).user?.id,
    body: request.body,
    query: request.query,
  });

  // En desarrollo, mostrar stack trace completo
  const response: any = {
    error: {
      code: 'INTERNAL_ERROR',
      message: isDevelopment
        ? error.message
        : 'Ocurrió un error inesperado. Por favor intenta nuevamente.',
    },
  };

  if (isDevelopment) {
    response.error.stack = error.stack;
  }

  return reply.code(500).send(response);
}

/**
 * Hook para logging de requests
 */
export async function requestLogger(request: FastifyRequest, reply: FastifyReply) {
  const start = Date.now();

  reply.raw.on('finish', () => {
    const duration = Date.now() - start;

    logger.info({
      type: 'http',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      userId: (request as any).user?.id,
      grupoEconomicoId: (request as any).user?.grupoEconomicoId,
    });
  });
}

/**
 * Hook para manejo de rutas no encontradas
 */
export async function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  return reply.code(404).send({
    error: {
      code: 'NOT_FOUND',
      message: `Ruta ${request.method} ${request.url} no encontrada`,
    },
  });
}
