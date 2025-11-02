import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Middleware de autenticación
 *
 * NOTA: Esta es una versión simplificada para desarrollo/testing.
 * En producción se integrará con Clerk para autenticación JWT real.
 *
 * Por ahora, acepta un header 'x-user-id' para simular usuarios.
 */

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: number;
      email: string;
      nombre: string;
      grupoEconomicoId: number;
      rol: string;
    };
  }
}

/**
 * Middleware para autenticar usuarios
 * Verifica que el request tenga un usuario válido
 */
export async function authenticateUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    // En desarrollo: permitir autenticación con header x-user-id
    const userId = request.headers['x-user-id'];

    if (!userId) {
      throw new UnauthorizedError('No se proporcionó autenticación');
    }

    // Buscar usuario en la base de datos
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(userId) },
      include: {
        grupos: {
          include: {
            grupoEconomico: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedError('Usuario no encontrado');
    }

    if (!usuario.activo) {
      throw new ForbiddenError('Usuario desactivado');
    }

    // Verificar que tenga acceso a al menos un grupo
    if (usuario.grupos.length === 0) {
      throw new ForbiddenError('Usuario sin grupo económico asignado');
    }

    // Por ahora, usar el primer grupo
    // TODO: Permitir al usuario seleccionar el grupo activo
    const grupoActivo = usuario.grupos[0];

    // Agregar usuario al request
    request.user = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      grupoEconomicoId: grupoActivo.grupoEconomicoId,
      rol: grupoActivo.rol,
    };

    logger.debug({
      type: 'auth',
      userId: usuario.id,
      grupoEconomicoId: grupoActivo.grupoEconomicoId,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      throw error;
    }

    logger.error({
      type: 'auth_error',
      error,
    });

    throw new UnauthorizedError('Error al autenticar usuario');
  }
}

/**
 * Middleware para verificar roles
 * Usar después de authenticateUser
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError();
    }

    if (!allowedRoles.includes(request.user.rol)) {
      throw new ForbiddenError(
        `Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      );
    }
  };
}

/**
 * Middleware para verificar acceso a un grupo económico
 */
export async function verifyGrupoAccess(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    throw new UnauthorizedError();
  }

  // Obtener grupoId del parámetro o query
  const grupoId =
    Number((request.params as any).grupoId) ||
    Number((request.query as any).grupoId);

  if (grupoId && grupoId !== request.user.grupoEconomicoId) {
    throw new ForbiddenError('No tienes acceso a este grupo económico');
  }
}

/**
 * TODO: Integración con Clerk
 *
 * Cuando se integre Clerk, reemplazar authenticateUser con:
 *
 * import { clerkClient } from '@clerk/backend';
 *
 * export async function authenticateUser(request: FastifyRequest, reply: FastifyReply) {
 *   const token = request.headers.authorization?.replace('Bearer ', '');
 *
 *   if (!token) {
 *     throw new UnauthorizedError();
 *   }
 *
 *   try {
 *     // Verificar JWT con Clerk
 *     const session = await clerkClient.sessions.verifySession(sessionId, token);
 *     const clerkUser = await clerkClient.users.getUser(session.userId);
 *
 *     // Buscar usuario en nuestra DB
 *     const usuario = await prisma.usuario.findUnique({
 *       where: { authProviderId: clerkUser.id }
 *     });
 *
 *     request.user = {
 *       id: usuario.id,
 *       email: clerkUser.emailAddresses[0].emailAddress,
 *       ...
 *     };
 *   } catch (error) {
 *     throw new UnauthorizedError('Token inválido');
 *   }
 * }
 */
