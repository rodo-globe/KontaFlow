import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { corsOptions, rateLimitOptions } from '../../src/lib/config';
import { errorHandler, notFoundHandler } from '../../src/middleware/error-handler';
import { gruposRoutes } from '../../src/routes/grupos.routes';

let testServerInstance: FastifyInstance | null = null;

/**
 * Crea una instancia del servidor Fastify para testing
 * Reutiliza la misma instancia para todos los tests (performance)
 */
export async function createTestServer(): Promise<FastifyInstance> {
  if (testServerInstance) {
    return testServerInstance;
  }

  const fastify = Fastify({
    logger: false, // Sin logs en tests
  });

  // Plugins
  await fastify.register(cors, corsOptions);
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });
  await fastify.register(rateLimit, {
    ...rateLimitOptions,
    max: 1000, // Límite alto para tests
  });

  // Middleware
  fastify.setErrorHandler(errorHandler);
  fastify.setNotFoundHandler(notFoundHandler);

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    environment: 'test',
  }));

  // Routes
  await fastify.register(
    async (instance) => {
      await instance.register(gruposRoutes, { prefix: '/grupos' });
    },
    { prefix: '/api' }
  );

  testServerInstance = fastify;
  return fastify;
}

/**
 * Cierra el servidor de testing
 */
export async function closeTestServer() {
  if (testServerInstance) {
    await testServerInstance.close();
    testServerInstance = null;
  }
}

/**
 * Obtiene la instancia actual del servidor (si existe)
 */
export function getTestServer(): FastifyInstance {
  if (!testServerInstance) {
    throw new Error('Test server not initialized. Call createTestServer() first.');
  }
  return testServerInstance;
}
