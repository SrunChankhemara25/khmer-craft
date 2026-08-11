import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap, throwError } from 'rxjs';
import {
  ApiError,
  AuthResponse,
  AuthUser,
  MessageResponse,
  UserRole,
} from './auth.models';
import { AUTH_URL as API_URL } from '../api/api.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userState = signal<AuthUser | null>(null);
  private readonly checkedState = signal(false);

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.userState()));

  register(payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    return this.http
      .post<AuthResponse>(`${API_URL}/register`, payload)
      .pipe(tap(({ user }) => this.setUser(user)));
  }

  login(email: string, password: string, expectedRole: UserRole) {
    return this.http
      .post<AuthResponse>(`${API_URL}/login`, {
        email,
        password,
        expectedRole,
      })
      .pipe(tap(({ user }) => this.setUser(user)));
  }

  logout() {
    return this.http.post<MessageResponse>(`${API_URL}/logout`, {}).pipe(
      finalize(() => {
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
        this.userState.set(null);
        this.checkedState.set(true);
        return of(null);
      }),
    );
  }

  private setUser(user: AuthUser) {
    this.userState.set(user);
    this.checkedState.set(true);
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
