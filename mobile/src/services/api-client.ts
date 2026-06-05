// ============================================================================
// دروب (Droob) — API Client
// Fastify backend communication with Zod validation, JWT auth, Redis caching
// ============================================================================

import Constants from 'expo-constants';
import { z } from 'zod';

const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:3000';
const API_VERSION = '/api/v1';
const TIMEOUT_MS = 10_000;

let authToken: string | null = null;

// ─── Auth Token Management ─────────────────────────────────────────────────
export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
}

// ─── Base HTTP Client ─────────────────────────────────────────────────────
interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  schema?: z.ZodTypeAny;
}

// ─── Errors ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public enMessage?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Thrown when the device has no network connectivity or a request times out.
 * Message is deliberately in Arabic since the app's primary UI language is Arabic.
 */
export class OfflineError extends Error {
  constructor() {
    super('لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى.');
    this.name = 'OfflineError';
  }
}

const STATUS_MESSAGES: Record<number, { ar: string; en: string }> = {
  400: { ar: 'طلب غير صالح. يرجى التحقق من البيانات.', en: 'Invalid request. Please check your input.' },
  401: { ar: 'غير مصرح. يرجى تسجيل الدخول مرة أخرى.', en: 'Unauthorized. Please log in again.' },
  403: { ar: 'تم رفض الوصول.', en: 'Access denied.' },
  404: { ar: 'المورد غير موجود.', en: 'Resource not found.' },
  408: { ar: 'انتهت مهلة الطلب.', en: 'Request timed out.' },
  422: { ar: 'فشل التحقق من صحة البيانات.', en: 'Validation failed.' },
  429: { ar: 'طلبات كثيرة جداً. يرجى المحاولة لاحقاً.', en: 'Too many requests. Please try again later.' },
  500: { ar: 'خطأ في الخادم. يرجى المحاولة لاحقاً.', en: 'Server error. Please try again later.' },
  502: { ar: 'الخدمة غير متاحة مؤقتاً.', en: 'Service temporarily unavailable.' },
  503: { ar: 'الخدمة غير متاحة. يرجى المحاولة لاحقاً.', en: 'Service unavailable. Please try again later.' },
};

/**
 * Returns true if the given error is network-related (offline, timeout, DNS failure, etc.).
 * Use this in callers to show offline UI instead of a generic error toast.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof OfflineError) return true;
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network request failed') ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror')
    );
  }
  return false;
}

// ─── Core Fetch with Timeout ──────────────────────────────────────────────

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { body, params, schema, ...fetchOptions } = options;

  // Build URL with query params
  let url = `${API_URL}${API_VERSION}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': 'ar',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const method = (fetchOptions.method || 'GET').toUpperCase();
  // Retry GET requests once on network failure or server error (5xx)
  const maxAttempts = method === 'GET' ? 2 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(url, {
          ...fetchOptions,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data: unknown;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text;
      }

      if (!response.ok) {
        const err = data as { error?: string; message?: string };
        const msgs = STATUS_MESSAGES[response.status] ?? {
          ar: 'حدث خطأ غير متوقع.',
          en: 'An unexpected error occurred.',
        };
        throw new ApiError(
          response.status,
          err.error || 'UnknownError',
          err.message || msgs.ar,
          msgs.en,
        );
      }

      // Optional Zod validation
      if (schema) {
        return schema.parse(data) as T;
      }

      return data as T;
    } catch (err) {
      // Map raw network / timeout errors to a typed OfflineError
      if (err instanceof DOMException && err.name === 'AbortError') {
        lastError = new OfflineError();
      } else if (err instanceof TypeError) {
        lastError = new OfflineError();
      } else {
        lastError = err;
      }

      // Retry GET on network errors or server errors (5xx)
      if (method === 'GET' && attempt < maxAttempts) {
        const isServerError = err instanceof ApiError && err.status >= 500;
        if (isNetworkError(lastError) || isServerError) {
          continue;
        }
      }

      throw lastError;
    }
  }

  // Should not be reached — loop either returns or throws
  throw lastError;
}

// ─── API Methods ──────────────────────────────────────────────────────────

// ── Stops ─────────────────────────────────────────────────────────────────
export const stopsApi = {
  list: (params: {
    q?: string; governorate?: string; mode?: string;
    lat?: number; lng?: number; radius?: number;
    limit?: number; offset?: number; isTerminal?: boolean;
  }) => apiFetch('/stops', { params: params as Record<string, string | number | boolean | undefined> }),

  getById: (id: string) => apiFetch(`/stops/${id}`),

  nearby: (lat: number, lng: number) => apiFetch(`/stops/nearby/${lat}/${lng}`),
};

// ── Routes ───────────────────────────────────────────────────────────────
export const routesApi = {
  list: (params: {
    mode?: string; governorate?: string; isActive?: boolean;
    limit?: number; offset?: number;
  }) => apiFetch('/routes', { params: params as Record<string, string | number | boolean | undefined> }),

  getById: (id: string) => apiFetch(`/routes/${id}`),

  getStops: (id: string) => apiFetch(`/routes/${id}/stops`),

  getSchedule: (id: string, dayType?: string) =>
    apiFetch(`/routes/${id}/schedule`, { params: { dayType } as Record<string, string> }),
};

// ── Trip Planner ─────────────────────────────────────────────────────────
export const tripPlannerApi = {
  plan: (params: {
    fromLat: number; fromLng: number; toLat: number; toLng: number;
    time?: string; timeType?: 'depart' | 'arrive';
    maxWalkMeters?: number; maxTransfers?: number;
    preferredModes?: string[]; preference?: string;
  }) => apiFetch('/trip-planner', {
    params: {
      ...params,
      preferredModes: params.preferredModes?.join(','),
    } as Record<string, string | number | boolean | undefined>,
  }),
};

// ── Departures ───────────────────────────────────────────────────────────
export const departuresApi = {
  getForStop: (stopId: string, date?: string, modes?: string[]) =>
    apiFetch('/departures', {
      params: { stopId, date, modes: modes?.join(',') } as Record<string, string | number | boolean | undefined>,
    }),
};

// ── Vehicles ─────────────────────────────────────────────────────────────
export const vehiclesApi = {
  list: (params?: { routeId?: string; status?: string }) =>
    apiFetch('/vehicles', { params: params as Record<string, string> | undefined }),
  getById: (id: string) => apiFetch(`/vehicles/${id}`),
};

// ── Alerts ───────────────────────────────────────────────────────────────
export const alertsApi = {
  list: (params?: { isActive?: boolean; governorate?: string }) =>
    apiFetch('/alerts', { params: params as Record<string, string | number | boolean | undefined> }),
};

// ── Community Reports ────────────────────────────────────────────────────
export const reportsApi = {
  create: (data: {
    type: string; stopId?: string; routeId?: string;
    lat: number; lng: number; message: string;
  }) => apiFetch('/reports', {
    method: 'POST',
    body: data,
  }),
};

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: unknown }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  register: (data: { fullName_ar: string; fullName_en: string; email: string; password: string; phone: string }) =>
    apiFetch<{ token: string; user: unknown }>('/auth/register', {
      method: 'POST',
      body: data,
    }),

  refresh: (refreshToken: string) =>
    apiFetch<{ token: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    }),

  profile: () => apiFetch('/auth/profile'),
};
