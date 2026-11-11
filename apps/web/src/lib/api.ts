import type { ApiError, AuthResponse, LoginInput, MeDto, RegisterInput } from '@deadlinehero/shared';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

/** Eroare întoarsă de API, cu forma { code, message, details }. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError,
  ) {
    super(body.message);
  }
}

// Tokenul de acces stă doar în memorie; refresh token-ul e într-un cookie HttpOnly.
let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResponse> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function send<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiRequestError(0, { code: 'NETWORK_ERROR', message: 'Serverul nu răspunde. Verificați conexiunea.' });
  }

  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      body && typeof body === 'object' && 'code' in body
        ? (body as ApiError)
        : { code: 'HTTP_ERROR', message: `Eroare ${response.status}` };
    throw new ApiRequestError(response.status, error);
  }
  return body as T;
}

/** Cerere autentificată; dacă tokenul a expirat, îl reînnoiește o dată și repetă cererea. */
async function authed<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await send<T>(path, init);
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return send<T>(path, init);
  }
}

function startSession(response: AuthResponse): AuthResponse {
  setAccessToken(response.accessToken);
  return response;
}

export function refreshSession(): Promise<AuthResponse> {
  refreshInFlight ??= send<AuthResponse>('/auth/refresh', { method: 'POST' })
    .then(startSession)
    .catch((error: unknown) => {
      setAccessToken(null);
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export const api = {
  register: (input: RegisterInput) =>
    send<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }).then(startSession),
  login: (input: LoginInput) =>
    send<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }).then(startSession),
  logout: async () => {
    try {
      await send<void>('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },
  refresh: refreshSession,
  me: () => authed<MeDto>('/me'),
};
