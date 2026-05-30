// ============================================================================
// دروب (Droob) — API Client
// Fastify backend communication with Zod validation, JWT auth, Redis caching
// ============================================================================

import Constants from 'expo-constants';
import { z } from 'zod';

const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:3000';
const API_VERSION = '/api/v1';

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

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
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
    ...fetchOptions.headers as Record<string, string>,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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
    throw new ApiError(
      response.status,
      err.error || 'UnknownError',
      err.message || 'An error occurred',
    );
  }

  // Optional Zod validation
  if (schema) {
    return schema.parse(data) as T;
  }

  return data as T;
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