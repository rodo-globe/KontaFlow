import type { CreateGrupoDto } from '../../src/validators/grupos.schema';

/**
 * Factory para crear datos de Grupo Económico
 * Genera datos válidos por defecto, pero permite overrides
 * Usa timestamp para garantizar unicidad
 */
export function buildGrupo(overrides?: Partial<CreateGrupoDto>): CreateGrupoDto {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    nombre: `Grupo Test ${timestamp}-${random}`,
    paisPrincipal: 'UY',
    monedaBase: 'UYU',
    rutControlador: undefined,
    ...overrides,
  };
}

/**
 * Factory para crear múltiples grupos
 */
export function buildGrupos(count: number, overrides?: Partial<CreateGrupoDto>): CreateGrupoDto[] {
  return Array.from({ length: count }, () => buildGrupo(overrides));
}

/**
 * Presets comunes
 */
export const grupoPresets = {
  uruguay: (): CreateGrupoDto => buildGrupo({
    paisPrincipal: 'UY',
    monedaBase: 'UYU',
  }),

  uruguayUSD: (): CreateGrupoDto => buildGrupo({
    paisPrincipal: 'UY',
    monedaBase: 'USD',
  }),

  argentina: (): CreateGrupoDto => buildGrupo({
    paisPrincipal: 'AR',
    monedaBase: 'ARS',
  }),

  brasil: (): CreateGrupoDto => buildGrupo({
    paisPrincipal: 'BR',
    monedaBase: 'BRL',
  }),

  conRUT: (): CreateGrupoDto => buildGrupo({
    rutControlador: '217890120018',
  }),
};
