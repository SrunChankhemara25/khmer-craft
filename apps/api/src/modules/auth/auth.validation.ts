import { z } from 'zod';
import { USER_ROLES } from '../../../models/User';

const email = z
  .string()
  .trim()
  .email('Enter a valid email address')
  .max(254)
  .transform((value) => value.toLowerCase());

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number');

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    password,
    phone: z.string().trim().min(8).max(30).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1).max(72),
    // SELLER was missing, so a seller account could never sign in — the
    // storefront login sends expectedRole and the request was rejected before
    // credentials were even checked. Kept in step with USER_ROLES.
    expectedRole: z.enum(USER_ROLES).optional(),
  })
  .strict();

export const forgotPasswordSchema = z.object({ email }).strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(256),
    password,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'New password must be different',
    path: ['newPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
