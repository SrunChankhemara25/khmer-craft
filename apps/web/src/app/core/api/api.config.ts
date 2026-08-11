/**
 * Base URL for the KhmerCraft API.
 *
 * Kept in one place so deploying somewhere other than a developer's laptop is
 * a single edit. It used to be hardcoded inside auth.service.ts, which meant
 * every new service repeated the same string.
 *
 * TODO(deploy): read this from an Angular environment file, or from a
 * `<meta name="api-base">` tag injected at container start, before this ships
 * anywhere real.
 */
export const API_BASE = 'http://localhost:3001';

/** Auth is still mounted at /auth rather than /api/auth on the server. */
export const AUTH_URL = `${API_BASE}/auth`;
export const API_URL = `${API_BASE}/api`;
