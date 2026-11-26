import type {
  ApiError,
  AuthResponse,
  ChangePasswordInput,
  CreateQuestInput,
  CreateTaskInput,
  ForgotPasswordInput,
  MyTeamResponse,
  QuestDto,
  ResetPasswordInput,
  TeamDto,
  UpdateProfileInput,
  HistoryEntryDto,
  LoginInput,
  MeDto,
  Page,
  RegisterInput,
  TaskActionResponse,
  TaskDto,
  TaskStatus,
  UpdateTaskInput,
} from '@deadlinehero/shared';

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

/** Tokenul curent, pentru conexiunea WebSocket a echipei. */
export function getAccessToken(): string | null {
  return accessToken;
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
    // O parolă greșită (la schimbare sau ștergere) nu înseamnă o sesiune expirată.
    if (!(error instanceof ApiRequestError) || error.status !== 401 || error.body.code === 'WRONG_PASSWORD') throw error;
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
  updateProfile: (input: UpdateProfileInput) => authed<MeDto>('/me', { method: 'PATCH', body: JSON.stringify(input) }),
  changePassword: (input: ChangePasswordInput) =>
    authed<AuthResponse>('/auth/change-password', { method: 'POST', body: JSON.stringify(input) }).then(startSession),
  forgotPassword: (input: ForgotPasswordInput) =>
    send<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(input) }),
  resetPassword: (input: ResetPasswordInput) =>
    send<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify(input) }),
  exportData: () => authed<Record<string, unknown>>('/me/export'),
  deleteAccount: async (password: string) => {
    await authed<void>('/me', { method: 'DELETE', body: JSON.stringify({ password }) });
    setAccessToken(null);
  },

  teams: {
    mine: () => authed<MyTeamResponse>('/teams/me'),
    create: (name: string) => authed<TeamDto>('/teams', { method: 'POST', body: JSON.stringify({ name }) }),
    join: (code: string) => authed<TeamDto>('/teams/join', { method: 'POST', body: JSON.stringify({ code }) }),
    leave: () => authed<void>('/teams/me/leave', { method: 'POST' }),
    kick: (userId: string) => authed<TeamDto>(`/teams/me/members/${userId}`, { method: 'DELETE' }),
    regenerateCode: () => authed<TeamDto>('/teams/me/regenerate-code', { method: 'POST' }),
  },

  quests: {
    list: () => authed<QuestDto[]>('/quests'),
    create: (input: CreateQuestInput) => authed<QuestDto>('/quests', { method: 'POST', body: JSON.stringify(input) }),
    done: (id: string) => authed<QuestDto>(`/quests/${id}/done`, { method: 'POST' }),
    cancel: (id: string) => authed<QuestDto>(`/quests/${id}/cancel`, { method: 'POST' }),
    validate: (id: string, userId: string) =>
      authed<QuestDto>(`/quests/${id}/participants/${userId}/validate`, { method: 'POST' }),
    reject: (id: string, userId: string, reason: string) =>
      authed<QuestDto>(`/quests/${id}/participants/${userId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    excuse: (id: string, userId: string) =>
      authed<QuestDto>(`/quests/${id}/participants/${userId}/excuse`, { method: 'POST' }),
  },

  tasks: {
    list: (params: { status: TaskStatus[]; sort: 'deadline' | 'recent'; limit?: number }) => {
      const query = new URLSearchParams({ status: params.status.join(','), sort: params.sort, limit: String(params.limit ?? 100) });
      return authed<Page<TaskDto>>(`/tasks?${query}`);
    },
    create: (input: CreateTaskInput) => authed<TaskDto>('/tasks', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: UpdateTaskInput) =>
      authed<TaskDto>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    complete: (id: string) => authed<TaskActionResponse>(`/tasks/${id}/complete`, { method: 'POST' }),
    cancel: (id: string) => authed<TaskActionResponse>(`/tasks/${id}/cancel`, { method: 'POST' }),
    undo: (id: string) => authed<TaskActionResponse>(`/tasks/${id}/undo`, { method: 'POST' }),
    remove: (id: string) => authed<void>(`/tasks/${id}`, { method: 'DELETE' }),
  },

  history: (cursor?: string) =>
    authed<Page<HistoryEntryDto>>(`/history?limit=50${cursor ? `&cursor=${cursor}` : ''}`),
};
