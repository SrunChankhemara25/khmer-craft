import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap, throwError } from 'rxjs';
import {
  ApiError,
  AuthResponse,
  AuthUser,
  MessageResponse,
  RegisterResponse,
  ResendCodeResponse,
  UserRole,
} from './auth.models';
import { AUTH_URL as API_URL } from '../api/api.config';

const TOKEN_STORAGE_KEY = 'khmercraft_token';
const USER_STORAGE_KEY = 'khmercraft_user';

function restoreCachedUser(): AuthUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userState = signal<AuthUser | null>(restoreCachedUser());
  private readonly checkedState = signal(false);

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.userState()));

  constructor() {
    // If a cached user or auth token is present, perform a background check to keep state synced
    if (typeof localStorage !== 'undefined') {
      const hasToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const hasUser = localStorage.getItem(USER_STORAGE_KEY);
      if (hasToken || hasUser) {
        this.loadCurrentUser().subscribe();
      }
    }
  }

  /** Creates the account and sends a 6-digit code — no session yet. */
  register(payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone?: string;
  }) {
    return this.http.post<RegisterResponse>(`${API_URL}/register`, payload);
  }

  /** Confirms the code and starts the session, same as login. */
  verifyEmail(email: string, code: string) {
    return this.http
      .post<AuthResponse>(`${API_URL}/verify-email`, { email, code })
      .pipe(
        tap((res) => {
          if (res.token || res.accessToken) {
            localStorage.setItem(TOKEN_STORAGE_KEY, res.token || res.accessToken!);
          }
          this.setUser(res.user);
        }),
      );
  }

  resendCode(email: string) {
    return this.http.post<ResendCodeResponse>(`${API_URL}/resend-code`, {
      email,
    });
  }

  continueWithGoogle(returnUrl?: string) {
    const params = new URLSearchParams();
    if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//')) {
      params.set('returnUrl', returnUrl);
    }
    globalThis.location.assign(`${API_URL}/google${params.size ? `?${params}` : ''}`);
  }

  continueWithTelegram(returnUrl?: string) {
    const params = new URLSearchParams();
    if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//')) {
      params.set('returnUrl', returnUrl);
    }
    globalThis.location.assign(`${API_URL}/telegram${params.size ? `?${params}` : ''}`);
  }

  /**
   * `expectedRole` narrows sign-in to one role and is only for the dedicated
   * portals (/seller/login, /admin/login). The server rejects a mismatch with
   * a plain INVALID_CREDENTIALS, so passing it on the *unified* /login page
   * locked every seller and admin out of it with "Email or password is
   * incorrect" even when the password was right. Omit it there.
   */
  login(email: string, password: string, expectedRole?: UserRole) {
    return this.http
      .post<AuthResponse>(`${API_URL}/login`, {
        email,
        password,
        ...(expectedRole ? { expectedRole } : {}),
      })
      .pipe(
        tap((res) => {
          if (res.token || res.accessToken) {
            localStorage.setItem(TOKEN_STORAGE_KEY, res.token || res.accessToken!);
          }
          this.setUser(res.user);
        }),
      );
  }

  logout() {
    return this.http.post<MessageResponse>(`${API_URL}/logout`, {}).pipe(
      finalize(() => {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
        this.userState.set(null);
        this.checkedState.set(true);
      }),
    );
  }

  forgotPassword(email: string) {
    return this.http.post<MessageResponse>(`${API_URL}/forgot-password`, {
      email,
    });
  }

  resetPassword(
    token: string,
    password: string,
    confirmPassword: string,
  ) {
    return this.http.post<MessageResponse>(`${API_URL}/reset-password`, {
      token,
      password,
      confirmPassword,
    });
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    return this.http.patch<MessageResponse>(`${API_URL}/change-password`, {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  }

  loadCurrentUser(): Observable<AuthUser | null> {
    if (this.checkedState()) {
      return of(this.userState());
    }

    return this.http.get<{ user: AuthUser }>(`${API_URL}/me`).pipe(
      map(({ user }) => {
        this.setUser(user);
        return user;
      }),
      catchError(() => {
        // Clear stale session if the server rejected auth
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
        this.userState.set(null);
        this.checkedState.set(true);
        return of(null);
      }),
    );
  }

  /** Reloads the server-issued session after a role-changing action such as opening a store. */
  refreshCurrentUser(): Observable<AuthUser | null> {
    this.checkedState.set(false);
    return this.loadCurrentUser();
  }

  /** Update user profile properties locally in cache and state */
  updateUser(partial: Partial<AuthUser>) {
    const current = this.userState();
    if (!current) return;
    const updated = { ...current, ...partial };
    this.setUser(updated);
  }

  /**
   * Adopt a session the server reissued mid-request.
   *
   * Opening a store promotes BUYER -> SELLER, which invalidates the bearer
   * token that authorised the call (the API re-checks the role claim on every
   * request). The create-store response hands back a replacement; without
   * swapping it in, the next call 401s, `loadCurrentUser` clears the session,
   * and the brand-new seller is bounced to the login page mid-payment.
   */
  adoptAccessToken(token: string | undefined | null): void {
    if (!token || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (e) {
      console.warn('Unable to persist the reissued session token:', e);
    }
  }

  private setUser(user: AuthUser) {
    this.userState.set(user);
    this.checkedState.set(true);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } catch (e) {
        console.warn('Unable to persist user to localStorage:', e);
      }
    }
  }
}

export const apiErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) => {
  if (error instanceof HttpErrorResponse) {
    return (error.error as ApiError | undefined)?.error?.message ?? fallback;
  }
  return fallback;
};
