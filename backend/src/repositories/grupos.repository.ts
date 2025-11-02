import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import type { CreateGrupoDto, UpdateGrupoDto, ListGruposQuery } from '../validators/grupos.schema';

/**
 * Repository para Grupos Económicos
 *
 * Responsable de todas las operaciones de base de datos
 * relacionadas con grupos económicos.
 */

export class GruposRepository {
  /**
   * Listar grupos económicos con paginación y filtros
   */
  async findMany(filters: ListGruposQuery) {
    const { page, limit, search, activo, paisPrincipal } = filters;

    const skip = (page - 1) * limit;

    // Construir where dinámico
    const where: Prisma.GrupoEconomicoWhereInput = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { rutControlador: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    if (paisPrincipal) {
      where.paisPrincipal = paisPrincipal;
    }

    // Ejecutar query con paginación
    const [grupos, total] = await Promise.all([
      prisma.grupoEconomico.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaCreacion: 'desc' },
        select: {
          id: true,
          nombre: true,
          rutControlador: true,
          paisPrincipal: true,
          monedaBase: true,
          fechaCreacion: true,
          activo: true,
          _count: {
            select: {
              empresas: true,
            },
          },
        },
      }),
      prisma.grupoEconomico.count({ where }),
    ]);

    return {
      data: grupos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Buscar un grupo por ID
   */
  async findById(id: number) {
    return await prisma.grupoEconomico.findUnique({
      where: { id },
      include: {
        empresas: {
          select: {
            id: true,
            nombre: true,
            rut: true,
            monedaFuncional: true,
            activa: true,
          },
        },
        planDeCuentas: {
          select: {
            id: true,
            nombre: true,
            activo: true,
          },
        },
        configuracion: true,
      },
    });
  }

  /**
   * Buscar grupos por usuario
   */
  async findByUsuarioId(usuarioId: number) {
    return await prisma.grupoEconomico.findMany({
      where: {
        usuariosGrupos: {
          some: {
            usuarioId,
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        paisPrincipal: true,
        monedaBase: true,
        activo: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Crear un nuevo grupo económico
   */
  async create(data: CreateGrupoDto, creadoPorUsuarioId: number) {
    return await prisma.$transaction(async (tx) => {
      // 1. Crear grupo económico
      const grupo = await tx.grupoEconomico.create({
        data: {
          nombre: data.nombre,
          rutControlador: data.rutControlador || null,
          paisPrincipal: data.paisPrincipal,
          monedaBase: data.monedaBase,
        },
      });

      // 2. Asignar el usuario creador como ADMIN del grupo
      await tx.usuarioGrupo.create({
        data: {
          usuarioId: creadoPorUsuarioId,
          grupoEconomicoId: grupo.id,
          rol: 'ADMIN',
        },
      });

      // 3. Crear configuración contable por defecto
      await tx.configuracionContable.create({
        data: {
          grupoEconomicoId: grupo.id,
          permitirAsientosEnPeriodoCerrado: false,
          requiereAprobacionGlobal: false,
          montoMinimoAprobacion: 50000.00,
          permitirAsientosDescuadrados: false,
          decimalesMonto: 2,
          decimalesTipoCambio: 4,
        },
      });

      // 4. Crear plan de cuentas vacío
      await tx.planDeCuentas.create({
        data: {
          grupoEconomicoId: grupo.id,
          nombre: `Plan de cuentas - ${grupo.nombre}`,
          descripcion: 'Plan de cuentas por defecto',
        },
      });

      // Retornar grupo con relaciones
      return await tx.grupoEconomico.findUnique({
        where: { id: grupo.id },
        include: {
          empresas: true,
          planDeCuentas: true,
          configuracion: true,
        },
      });
    });
  }

  /**
   * Actualizar un grupo económico
   */
  async update(id: number, data: UpdateGrupoDto) {
    return await prisma.grupoEconomico.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.rutControlador !== undefined && { rutControlador: data.rutControlador || null }),
        ...(data.paisPrincipal && { paisPrincipal: data.paisPrincipal }),
        ...(data.monedaBase && { monedaBase: data.monedaBase }),
        ...(data.activo !== undefined && { activo: data.activo }),
      },
      include: {
        empresas: {
          select: {
            id: true,
            nombre: true,
            rut: true,
            monedaFuncional: true,
            activa: true,
          },
        },
        planDeCuentas: true,
      },
    });
  }

  /**
   * Eliminar un grupo económico (soft delete)
   */
  async delete(id: number) {
    return await prisma.grupoEconomico.update({
      where: { id },
      data: { activo: false },
    });
  }

  /**
   * Verificar si un usuario tiene acceso a un grupo
   */
  async verificarAccesoUsuario(grupoId: number, usuarioId: number): Promise<boolean> {
    const acceso = await prisma.usuarioGrupo.findUnique({
      where: {
        usuarioId_grupoEconomicoId: {
          usuarioId,
          grupoEconomicoId: grupoId,
        },
      },
    });

    return acceso !== null;
  }

  /**
   * Verificar si un grupo existe
   */
  async exists(id: number): Promise<boolean> {
    const count = await prisma.grupoEconomico.count({
      where: { id },
    });

    return count > 0;
  }
}

// Exportar instancia singleton
export const gruposRepository = new GruposRepository();
