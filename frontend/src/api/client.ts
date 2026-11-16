const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let activeTenantId: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setActiveTenantHeader(tenantId: string | null) {
  activeTenantId = tenantId;
}

export function setOnUnauthorized(callback: () => void) {
  onUnauthorizedCallback = callback;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (activeTenantId) {
    headers['X-Empresa-Id'] = activeTenantId;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Para enviar y recibir cookies HttpOnly de sesión
  });

  if (response.status === 401) {
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || `Error en la solicitud (${response.status})`;
    const errorCode = data?.error?.code || 'API_ERROR';
    throw new ApiError(errorMsg, response.status, errorCode, data?.error?.details);
  }

  return (data?.data !== undefined ? data.data : data) as T;
}
