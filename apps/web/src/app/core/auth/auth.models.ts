export type UserRole = 'BUYER' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
}

export interface ApiError {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, string[]>;
  };
}
