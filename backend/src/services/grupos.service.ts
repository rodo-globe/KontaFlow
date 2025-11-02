import { gruposRepository } from '../repositories/grupos.repository';
import type { CreateGrupoDto, UpdateGrupoDto, ListGruposQuery } from '../validators/grupos.schema';
import { NotFoundError, ForbiddenError, BusinessRuleError } from '../lib/errors';
import { logger } from '../lib/logger';

/**
 * Service para Grupos Económicos
 *
 * Contiene toda la lógica de negocio relacionada con grupos económicos.
 */

export class GruposService {
  /**
   * Listar grupos económicos
   */
  async listar(filters: ListGruposQuery, usuarioId: number) {
    logger.debug({
      type: 'service',
      action: 'listar_grupos',
      usuarioId,
      filters,
    });

    // TODO: Filtrar solo grupos a los que el usuario tiene acceso
    // Por ahora retornamos todos
    return await gruposRepository.findMany(filters);
  }

  /**
   * Obtener un grupo por ID
   */
  async obtenerPorId(grupoId: number, usuarioId: number) {
    logger.debug({
      type: 'service',
      action: 'obtener_grupo',
      grupoId,
      usuarioId,
    });

    // Verificar que el grupo existe
    const grupo = await gruposRepository.findById(grupoId);

    if (!grupo) {
      throw new NotFoundError('Grupo Económico', grupoId);
    }

    // Verificar que el usuario tiene acceso
    const tieneAcceso = await gruposRepository.verificarAccesoUsuario(grupoId, usuarioId);

    if (!tieneAcceso) {
      throw new ForbiddenError('No tienes acceso a este grupo económico');
    }

    return grupo;
  }

  /**
   * Obtener grupos del usuario
   */
  async obtenerGruposUsuario(usuarioId: number) {
    logger.debug({
      type: 'service',
      action: 'obtener_grupos_usuario',
      usuarioId,
    });

    return await gruposRepository.findByUsuarioId(usuarioId);
  }

  /**
   * Crear un nuevo grupo económico
   */
  async crear(data: CreateGrupoDto, usuarioId: number) {
    logger.info({
      type: 'service',
      action: 'crear_grupo',
      usuarioId,
      nombre: data.nombre,
    });

    // Validaciones de negocio adicionales
    await this.validarDatosGrupo(data);

    // Crear grupo
    const grupo = await gruposRepository.create(data, usuarioId);

    logger.info({
      type: 'service',
      action: 'grupo_creado',
      grupoId: grupo!.id,
      usuarioId,
    });

    return grupo;
  }

  /**
   * Actualizar un grupo económico
   */
  async actualizar(grupoId: number, data: UpdateGrupoDto, usuarioId: number) {
    logger.info({
      type: 'service',
      action: 'actualizar_grupo',
      grupoId,
      usuarioId,
    });

    // Verificar que existe
    const existe = await gruposRepository.exists(grupoId);
    if (!existe) {
      throw new NotFoundError('Grupo Económico', grupoId);
    }

    // Verificar acceso
    const tieneAcceso = await gruposRepository.verificarAccesoUsuario(grupoId, usuarioId);
    if (!tieneAcceso) {
      throw new ForbiddenError('No tienes acceso a este grupo económico');
    }

    // TODO: Verificar que el usuario es ADMIN del grupo

    // Validaciones de negocio
    if (data.nombre || data.paisPrincipal || data.monedaBase) {
      await this.validarDatosGrupo(data as CreateGrupoDto);
    }

    // Actualizar
    const grupo = await gruposRepository.update(grupoId, data);

    logger.info({
      type: 'service',
      action: 'grupo_actualizado',
      grupoId,
      usuarioId,
    });

    return grupo;
  }

  /**
   * Eliminar un grupo económico (soft delete)
   */
  async eliminar(grupoId: number, usuarioId: number) {
    logger.warn({
      type: 'service',
      action: 'eliminar_grupo',
      grupoId,
      usuarioId,
    });

    // Verificar que existe
    const grupo = await gruposRepository.findById(grupoId);
    if (!grupo) {
      throw new NotFoundError('Grupo Económico', grupoId);
    }

    // Verificar acceso
    const tieneAcceso = await gruposRepository.verificarAccesoUsuario(grupoId, usuarioId);
    if (!tieneAcceso) {
      throw new ForbiddenError('No tienes acceso a este grupo económico');
    }

    // TODO: Verificar que el usuario es ADMIN del grupo

    // Validar que no hay empresas activas
    if (grupo.empresas && grupo.empresas.some((e) => e.activa)) {
      throw new BusinessRuleError(
        'No se puede eliminar un grupo con empresas activas. Desactiva las empresas primero.',
        'EMPRESAS_ACTIVAS'
      );
    }

    // Soft delete
    await gruposRepository.delete(grupoId);

    logger.info({
      type: 'service',
      action: 'grupo_eliminado',
      grupoId,
      usuarioId,
    });

    return { success: true, message: 'Grupo económico eliminado correctamente' };
  }

  /**
   * Validaciones de negocio adicionales
   */
  private async validarDatosGrupo(data: Partial<CreateGrupoDto>) {
    // Validar que el nombre no esté vacío (ya lo hace Zod, pero por seguridad)
    if (data.nombre && data.nombre.trim().length < 3) {
      throw new BusinessRuleError('El nombre debe tener al menos 3 caracteres');
    }

    // Validar formato de RUT si está presente
    if (data.rutControlador) {
      const rutValido = /^[0-9]{12}$/.test(data.rutControlador);
      if (!rutValido) {
        throw new BusinessRuleError('El RUT debe tener 12 dígitos numéricos');
      }
    }

    // Validaciones adicionales según el país
    if (data.paisPrincipal === 'UY' && data.monedaBase) {
      if (!['UYU', 'USD'].includes(data.monedaBase)) {
        throw new BusinessRuleError(
          'Para Uruguay, la moneda base debe ser UYU o USD',
          'MONEDA_INVALIDA_PAIS'
        );
      }
    }

    // TODO: Agregar más validaciones de negocio según se requieran
  }
}

// Exportar instancia singleton
export const gruposService = new GruposService();
