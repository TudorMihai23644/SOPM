import {
  CLIENT_HEADER,
  MOBILE_CLIENT,
  type ApiError,
  type AuthResponse,
  type ChangePasswordInput,
  type CreateQuestInput,
  type CreateTaskInput,
  type HistoryEntryDto,
  type LoginInput,
  type MeDto,
  type MyTeamResponse,
  type Page,
  type QuestDto,
  type RegisterInput,
  type TaskActionResponse,
  type TaskDto,
  type TaskStatus,
  type TeamDto,
  type UpdateProfileInput,
  type UpdateTaskInput,
} from '@deadlinehero/shared';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

/** Eroare întoarsă de API, cu forma { code, message, details }. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError,
  ) {
    super(body.message);
  }
}

/**
 * Tokenul de acces stă doar în memorie. Refresh token-ul (rotativ) stă în expo-secure-store
 * (Keychain / Keystore), nu în stocarea obișnuită, conform specificațiilor.
 */
const REFRESH_KEY = 'deadlinehero.refresh';
let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResponse> | null = null;
let onSessionLost: (() => void) | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

/** Apelat când sesiunea nu mai poate fi reînnoită (ex. parola schimbată pe alt dispozitiv). */
export function setSessionLostHandler(handler: (() => void) | null): void {
  onSessionLost = handler;
}

async function send<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set(CLIENT_HEADER, MOBILE_CLIENT);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'omit' });
  } catch {
    throw new ApiRequestError(0, {
      code: 'NETWORK_ERROR',
      message: 'Serverul nu răspunde. Verifică dacă telefonul și calculatorul sunt în aceeași rețea.',
    });
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

async function startSession(response: AuthResponse): Promise<AuthResponse> {
  accessToken = response.accessToken;
  if (response.refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, response.refreshToken);
  return response;
}

async function clearSession(): Promise<void> {
  accessToken = null;
  await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
}

/** Reînnoiește sesiunea cu refresh token-ul salvat; o singură cerere simultană. */
export function refreshSession(): Promise<AuthResponse> {
  refreshInFlight ??= (async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!refreshToken) throw new ApiRequestError(401, { code: 'INVALID_SESSION', message: 'Nu există o sesiune salvată.' });
    try {
      return await startSession(await send<AuthResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }));
    } catch (error) {
      // Doar un refuz explicit închide sesiunea; o problemă de rețea o păstrează pentru mai târziu.
      if (error instanceof ApiRequestError && error.status === 401) await clearSession();
      throw error;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Cerere autentificată; dacă tokenul a expirat, îl reînnoiește o dată și repetă cererea. */
async function authed<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await send<T>(path, init);
  } catch (error) {
    // O parolă greșită (la schimbare sau ștergere) nu înseamnă o sesiune expirată.
    if (!(error instanceof ApiRequestError) || error.status !== 401 || error.body.code === 'WRONG_PASSWORD') throw error;
    try {
      await refreshSession();
    } catch (refreshError) {
      if (refreshError instanceof ApiRequestError && refreshError.status === 401) onSessionLost?.();
      throw refreshError;
    }
    return send<T>(path, init);
  }
}

const post = (body?: unknown): RequestInit => ({ method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const api = {
  register: (input: RegisterInput) => send<AuthResponse>('/auth/register', post(input)).then(startSession),
  login: (input: LoginInput) => send<AuthResponse>('/auth/login', post(input)).then(startSession),
  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    try {
      await send<void>('/auth/logout', post({ refreshToken: refreshToken ?? undefined }));
    } finally {
      await clearSession();
    }
  },
  forgotPassword: (email: string) => send<void>('/auth/forgot-password', post({ email })),
  changePassword: (input: ChangePasswordInput) =>
    authed<AuthResponse>('/auth/change-password', post(input)).then(startSession),

  me: () => authed<MeDto>('/me'),
  updateProfile: (input: UpdateProfileInput) => authed<MeDto>('/me', { method: 'PATCH', body: JSON.stringify(input) }),
  exportData: () => authed<Record<string, unknown>>('/me/export'),
  deleteAccount: async (password: string) => {
    await authed<void>('/me', { method: 'DELETE', body: JSON.stringify({ password }) });
    await clearSession();
  },

  tasks: {
    list: (status: TaskStatus[]) =>
      authed<Page<TaskDto>>(`/tasks?status=${status.join(',')}&sort=deadline&limit=100`),
    recent: () => authed<Page<TaskDto>>('/tasks?status=COMPLETED,CANCELLED&sort=recent&limit=20'),
    create: (input: CreateTaskInput) => authed<TaskDto>('/tasks', post(input)),
    update: (id: string, input: UpdateTaskInput) =>
      authed<TaskDto>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    complete: (id: string) => authed<TaskActionResponse>(`/tasks/${id}/complete`, post()),
    cancel: (id: string) => authed<TaskActionResponse>(`/tasks/${id}/cancel`, post()),
    undo: (id: string) => authed<TaskActionResponse>(`/tasks/${id}/undo`, post()),
    remove: (id: string) => authed<void>(`/tasks/${id}`, { method: 'DELETE' }),
  },

  history: (cursor?: string) =>
    authed<Page<HistoryEntryDto>>(`/history?limit=50${cursor ? `&cursor=${cursor}` : ''}`),

  teams: {
    mine: () => authed<MyTeamResponse>('/teams/me'),
    create: (name: string) => authed<TeamDto>('/teams', post({ name })),
    join: (code: string) => authed<TeamDto>('/teams/join', post({ code })),
    leave: () => authed<void>('/teams/me/leave', post()),
    kick: (userId: string) => authed<TeamDto>(`/teams/me/members/${userId}`, { method: 'DELETE' }),
    regenerateCode: () => authed<TeamDto>('/teams/me/regenerate-code', post()),
  },

  quests: {
    list: () => authed<QuestDto[]>('/quests'),
    create: (input: CreateQuestInput) => authed<QuestDto>('/quests', post(input)),
    done: (id: string) => authed<QuestDto>(`/quests/${id}/done`, post()),
    cancel: (id: string) => authed<QuestDto>(`/quests/${id}/cancel`, post()),
    validate: (id: string, userId: string) => authed<QuestDto>(`/quests/${id}/participants/${userId}/validate`, post()),
    reject: (id: string, userId: string, reason: string) =>
      authed<QuestDto>(`/quests/${id}/participants/${userId}/reject`, post({ reason })),
    excuse: (id: string, userId: string) => authed<QuestDto>(`/quests/${id}/participants/${userId}/excuse`, post()),
  },
};

/** Primul mesaj de eroare pentru fiecare câmp, ca pe web. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiRequestError)) return { form: 'A apărut o eroare neașteptată.' };
  const { message, details } = error.body;
  if (details?.length) return Object.fromEntries(details.map((d) => [d.path || 'form', d.message]));
  const byCode: Record<string, string> = { EMAIL_TAKEN: 'email', NICKNAME_TAKEN: 'nickname' };
  return { [byCode[error.body.code] ?? 'form']: message };
}
