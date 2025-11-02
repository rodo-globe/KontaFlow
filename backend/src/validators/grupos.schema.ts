import { z } from 'zod';

/**
 * Schemas de validación para Grupos Económicos
 *
 * Utilizamos Zod para validación type-safe de los datos.
 */

// Códigos de país ISO 3166-1 alpha-2 más comunes en LATAM
const PAISES_VALIDOS = ['UY', 'AR', 'BR', 'CL', 'CO', 'PE', 'MX', 'US', 'ES'] as const;

// Monedas soportadas (códigos ISO 4217)
const MONEDAS_VALIDAS = ['UYU', 'USD', 'ARS', 'BRL', 'CLP', 'COP', 'PEN', 'MXN', 'EUR'] as const;

/**
 * Schema para crear un Grupo Económico
 */
export const CreateGrupoSchema = z.object({
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(200, 'El nombre no puede exceder 200 caracteres')
    .trim(),

  rutControlador: z
    .string()
    .regex(/^[0-9]{12}$/, 'El RUT debe tener 12 dígitos')
    .optional()
    .or(z.literal('')),

  paisPrincipal: z
    .enum(PAISES_VALIDOS, {
      errorMap: () => ({
        message: `País inválido. Debe ser uno de: ${PAISES_VALIDOS.join(', ')}`,
      }),
    }),

  monedaBase: z
    .enum(MONEDAS_VALIDAS, {
      errorMap: () => ({
        message: `Moneda inválida. Debe ser una de: ${MONEDAS_VALIDAS.join(', ')}`,
      }),
    }),
});

/**
 * Schema para actualizar un Grupo Económico
 * Todos los campos son opcionales
 */
export const UpdateGrupoSchema = z.object({
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(200, 'El nombre no puede exceder 200 caracteres')
    .trim()
    .optional(),

  rutControlador: z
    .string()
    .regex(/^[0-9]{12}$/, 'El RUT debe tener 12 dígitos')
    .optional()
    .or(z.literal('')),

  paisPrincipal: z
    .enum(PAISES_VALIDOS)
    .optional(),

  monedaBase: z
    .enum(MONEDAS_VALIDAS)
    .optional(),

  activo: z
    .boolean()
    .optional(),
});

/**
 * Schema para query params al listar grupos
 */
export const ListGruposQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .refine((n) => n > 0, 'La página debe ser mayor a 0'),

  limit: z
    .string()
    .optional()
    .default('10')
    .transform(Number)
    .refine((n) => n > 0 && n <= 100, 'El límite debe estar entre 1 y 100'),

  search: z
    .string()
    .optional(),

  activo: z
    .string()
    .optional()
    .transform((val) => val === 'true' ? true : val === 'false' ? false : undefined),

  paisPrincipal: z
    .enum(PAISES_VALIDOS)
    .optional(),
});

/**
 * Schema para parámetros de ruta
 */
export const GrupoParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'El ID debe ser un número')
    .transform(Number),
});

/**
 * Types exportados
 */
export type CreateGrupoDto = z.infer<typeof CreateGrupoSchema>;
export type UpdateGrupoDto = z.infer<typeof UpdateGrupoSchema>;
export type ListGruposQuery = z.infer<typeof ListGruposQuerySchema>;
export type GrupoParams = z.infer<typeof GrupoParamsSchema>;

/**
 * Helper para validar y parsear datos
 */
export function validateCreateGrupo(data: unknown): CreateGrupoDto {
  return CreateGrupoSchema.parse(data);
}

export function validateUpdateGrupo(data: unknown): UpdateGrupoDto {
  return UpdateGrupoSchema.parse(data);
}

export function validateListGruposQuery(data: unknown): ListGruposQuery {
  return ListGruposQuerySchema.parse(data);
}

export function validateGrupoParams(data: unknown): GrupoParams {
  return GrupoParamsSchema.parse(data);
}
