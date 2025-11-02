import { FastifyInstance } from 'fastify';
import { gruposService } from '../services/grupos.service';
import { authenticateUser } from '../middleware/auth';
import {
  CreateGrupoSchema,
  UpdateGrupoSchema,
  ListGruposQuerySchema,
  GrupoParamsSchema,
} from '../validators/grupos.schema';

/**
 * Rutas para Grupos Económicos
 *
 * Base path: /api/grupos
 */

export async function gruposRoutes(fastify: FastifyInstance) {
  // Aplicar autenticación a todas las rutas de este módulo
  fastify.addHook('preHandler', authenticateUser);

  /**
   * GET /api/grupos
   * Listar grupos económicos con paginación y filtros
   */
  fastify.get('/', async (request, reply) => {
    const filters = ListGruposQuerySchema.parse(request.query);
    const result = await gruposService.listar(filters, request.user!.id);

    return reply.send(result);
  });

  /**
   * GET /api/grupos/mis-grupos
   * Obtener grupos del usuario autenticado
   */
  fastify.get('/mis-grupos', async (request, reply) => {
    const grupos = await gruposService.obtenerGruposUsuario(request.user!.id);

    return reply.send({ data: grupos });
  });

  /**
   * GET /api/grupos/:id
   * Obtener un grupo económico por ID
   */
  fastify.get('/:id', async (request, reply) => {
    const { id } = GrupoParamsSchema.parse(request.params);
    const grupo = await gruposService.obtenerPorId(id, request.user!.id);

    return reply.send({ data: grupo });
  });

  /**
   * POST /api/grupos
   * Crear un nuevo grupo económico
   */
  fastify.post('/', async (request, reply) => {
    const data = CreateGrupoSchema.parse(request.body);
    const grupo = await gruposService.crear(data, request.user!.id);

    return reply.code(201).send({
      data: grupo,
      message: 'Grupo económico creado correctamente',
    });
  });

  /**
   * PUT /api/grupos/:id
   * Actualizar un grupo económico
   */
  fastify.put('/:id', async (request, reply) => {
    const { id } = GrupoParamsSchema.parse(request.params);
    const data = UpdateGrupoSchema.parse(request.body);
    const grupo = await gruposService.actualizar(id, data, request.user!.id);

    return reply.send({
      data: grupo,
      message: 'Grupo económico actualizado correctamente',
    });
  });

  /**
   * DELETE /api/grupos/:id
   * Eliminar un grupo económico (soft delete)
   */
  fastify.delete('/:id', async (request, reply) => {
    const { id } = GrupoParamsSchema.parse(request.params);
    const result = await gruposService.eliminar(id, request.user!.id);

    return reply.send(result);
  });
}
