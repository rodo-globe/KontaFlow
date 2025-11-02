/**
 * Sistema de errores personalizado para KontaFlow
 *
 * Jerarquía de errores:
 * - AppError: Base para todos los errores de la aplicación
 * - ValidationError: Errores de validación de datos (400)
 * - NotFoundError: Recurso no encontrado (404)
 * - ForbiddenError: Acceso denegado (403)
 * - UnauthorizedError: No autenticado (401)
 * - ConflictError: Conflicto de recursos (409)
 * - BusinessRuleError: Violación de regla de negocio (422)
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Mantener stack trace correcto
    Error.captureStackTrace(this, this.constructor);

    // Setear el nombre de la clase
    this.name = this.constructor.name;
  }
}

/**
 * Error de validación de datos
 * HTTP 400 - Bad Request
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');

    if (details) {
      (this as any).details = details;
    }
  }
}

/**
 * Recurso no encontrado
 * HTTP 404 - Not Found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: number | string) {
    const message = id
      ? `${resource} con id ${id} no encontrado`
      : `${resource} no encontrado`;

    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Acceso denegado por permisos
 * HTTP 403 - Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'No tienes permisos para realizar esta acción') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * No autenticado
 * HTTP 401 - Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Debes iniciar sesión para continuar') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Conflicto de recursos (ej: registro duplicado)
 * HTTP 409 - Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 409, 'CONFLICT');

    if (field) {
      (this as any).field = field;
    }
  }
}

/**
 * Violación de regla de negocio
 * HTTP 422 - Unprocessable Entity
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, rule?: string) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION');

    if (rule) {
      (this as any).rule = rule;
    }
  }
}

/**
 * Helper para verificar si un error es operacional
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Helper para formatear errores de Prisma
 */
export function handlePrismaError(error: any): AppError {
  // P2002: Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'campo';
    return new ConflictError(
      `Ya existe un registro con ese ${field}`,
      field
    );
  }

  // P2025: Record not found
  if (error.code === 'P2025') {
    return new NotFoundError('Registro');
  }

  // P2003: Foreign key constraint violation
  if (error.code === 'P2003') {
    return new BusinessRuleError(
      'No se puede completar la operación debido a relaciones con otros registros'
    );
  }

  // Error genérico de Prisma
  return new AppError(
    'Error en la base de datos',
    500,
    'DATABASE_ERROR',
    false
  );
}

/**
 * Helper para formatear errores de Zod
 */
export function handleZodError(error: any): ValidationError {
  const details: Record<string, string[]> = {};

  if (error.errors) {
    error.errors.forEach((err: any) => {
      const path = err.path.join('.');
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(err.message);
    });
  }

  return new ValidationError(
    'Error de validación en los datos enviados',
    details
  );
}
