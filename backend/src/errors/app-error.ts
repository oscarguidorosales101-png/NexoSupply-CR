export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'El recurso solicitado no fue encontrado', details?: unknown) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Acceso no autenticado o sesión expirada', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tiene permisos suficientes para ejecutar esta operación', details?: unknown) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Solicitud incorrecta o parámetros inválidos', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicto con el estado actual del recurso', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Error de validación en los datos enviados', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}
