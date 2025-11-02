import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { prisma } from './lib/prisma';
import { logger } from './lib/logger';
import { config, corsOptions, rateLimitOptions } from './lib/config';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { gruposRoutes } from './routes/grupos.routes';

/**
 * KontaFlow API Server
 *
 * Sistema de contabilidad con partida doble
 * Arquitectura por capas: Routes → Services → Repositories → Prisma
 */

const fastify = Fastify({
  logger: logger as any,
  requestIdHeader: 'x-request-id',
  trustProxy: true,
});

// ===================================
// PLUGINS
// ===================================
async function registerPlugins() {
  // CORS
  await fastify.register(cors, corsOptions);

  // Helmet - Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // Deshabilitado para desarrollo
  });

  // Rate Limiting
  await fastify.register(rateLimit, rateLimitOptions);

  logger.info('✅ Plugins registered');
}

// ===================================
// MIDDLEWARE
// ===================================
async function registerMiddleware() {
  // Error handler global
  fastify.setErrorHandler(errorHandler);

  // 404 handler
  fastify.setNotFoundHandler(notFoundHandler);

  logger.info('✅ Middleware registered');
}

// ===================================
// ROUTES
// ===================================
async function registerRoutes() {
  // Health check
  fastify.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: config.NODE_ENV,
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        environment: config.NODE_ENV,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Root endpoint
  fastify.get('/', async () => {
    return {
      name: 'KontaFlow API',
      version: '1.0.0',
      status: 'running',
      environment: config.NODE_ENV,
      endpoints: {
        health: '/health',
        api: '/api',
        docs: '/docs (próximamente)',
      },
    };
  });

  // API Routes (sin versionado por ahora, luego será /api/v1)
  await fastify.register(
    async (instance) => {
      // Grupos Económicos
      await instance.register(gruposRoutes, { prefix: '/grupos' });

      // TODO: Más features
      // await instance.register(empresasRoutes, { prefix: '/empresas' });
      // await instance.register(cuentasRoutes, { prefix: '/cuentas' });
      // await instance.register(asientosRoutes, { prefix: '/asientos' });
    },
    { prefix: '/api' }
  );

  logger.info('✅ Routes registered');
}

// ===================================
// START SERVER
// ===================================
async function start() {
  try {
    await registerPlugins();
    await registerMiddleware();
    await registerRoutes();

    await fastify.listen({
      port: config.PORT,
      host: config.HOST,
    });

    logger.info('');
    logger.info('🚀 KontaFlow API Server Started');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`📍 Server: http://${config.HOST}:${config.PORT}`);
    logger.info(`🏥 Health: http://${config.HOST}:${config.PORT}/health`);
    logger.info(`🔧 Environment: ${config.NODE_ENV}`);
    logger.info(`🗄️  Database: Connected`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('');
    logger.info('📋 Available Endpoints:');
    logger.info('   GET  /api/grupos           - Listar grupos');
    logger.info('   GET  /api/grupos/mis-grupos - Mis grupos');
    logger.info('   GET  /api/grupos/:id        - Obtener grupo');
    logger.info('   POST /api/grupos            - Crear grupo');
    logger.info('   PUT  /api/grupos/:id        - Actualizar grupo');
    logger.info('   DELETE /api/grupos/:id      - Eliminar grupo');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('');
    logger.info('💡 Tip: Use header "x-user-id: 1" para autenticación en desarrollo');
    logger.info('');
  } catch (err) {
    console.error('❌ Error starting server:', err);
    logger.error({ err }, '❌ Error starting server');
    process.exit(1);
  }
}

// ===================================
// GRACEFUL SHUTDOWN
// ===================================
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, closing server gracefully...`);

  try {
    await fastify.close();
    await prisma.$disconnect();
    logger.info('✅ Server closed successfully');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
start();
