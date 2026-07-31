import crypto from 'node:crypto';
import mongoose from 'mongoose';
import PasswordResetToken from '../../../models/PasswordResetToken';
import RefreshToken from '../../../models/RefreshToken';
import User, { IUser } from '../../../models/User';
import { env } from '../../config/env';
import { AppError } from '../../errors/app-error';
import { signAccessToken } from '../../utils/jwt';
import {
  hashPassword,
  verifyPassword,
  verifyPasswordConstantTime,
} from '../../utils/password';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from './auth.validation';

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hashResetToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');
const hashRefreshToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

const createRefreshToken = () => crypto.randomBytes(48).toString('base64url');

export class AuthService {
  private async createSession(user: IUser) {
    const refreshToken = createRefreshToken();
    await RefreshToken.create({
      user_id: user._id,
      token_hash: hashRefreshToken(refreshToken),
      expires_at: new Date(
        Date.now() + env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
      ),
    });

    return {
      accessToken: signAccessToken(
        user._id.toString(),
        user.role,
        user.token_version,
      ),
      refreshToken,
    };
  }

  async register(input: RegisterInput) {
    const email = normalizeEmail(input.email);
    if (await User.exists({ email })) {
      throw new AppError(
        409,
        'An account with this email already exists',
        'EMAIL_IN_USE',
      );
    }

    const user = await User.create({
      name: input.name,
      email,
      password_hash: await hashPassword(input.password),
      phone: input.phone,
      role: 'BUYER',
      status: 'ACTIVE',
    });

    return { user, ...(await this.createSession(user)) };
  }

  /**
   * Progressive lockout. Rate limiting is keyed on the caller; this is keyed
   * on the account, so an attacker spreading attempts across many IPs still
   * runs out of guesses.
   */
  private async registerFailedLogin(user: IUser) {
    const attempts = user.failed_login_attempts + 1;

    if (attempts >= env.maxFailedLogins) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            failed_login_attempts: 0,
            locked_until: new Date(
              Date.now() + env.accountLockMinutes * 60 * 1000,
            ),
          },
        },
      );
      return;
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { failed_login_attempts: attempts } },
    );
  }

  async login(input: LoginInput) {
    const user = await User.findOne({
      email: normalizeEmail(input.email),
    }).select('+password_hash');

    const isLocked = Boolean(
      user?.locked_until && user.locked_until.getTime() > Date.now(),
    );

    // Runs for unknown accounts too, so response time never reveals which
    // emails are registered.
    const passwordMatches = await verifyPasswordConstantTime(
      input.password,
      user?.password_hash,
    );

    if (!user || !passwordMatches) {
      if (user && !isLocked) {
        await this.registerFailedLogin(user);
      }
      throw new AppError(
        401,
        'Email or password is incorrect',
        'INVALID_CREDENTIALS',
      );
    }

    // Only disclosed once the correct password has been supplied, so this
    // cannot be used to discover accounts.
    if (isLocked) {
      throw new AppError(
        423,
        'Too many failed sign-in attempts. Try again later.',
        'ACCOUNT_LOCKED',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(403, 'This account is not active', 'ACCOUNT_INACTIVE');
    }

    if (input.expectedRole && user.role !== input.expectedRole) {
      throw new AppError(
        401,
        'Email or password is incorrect',
        'INVALID_CREDENTIALS',
      );
    }

    if (user.failed_login_attempts > 0 || user.locked_until) {
      await User.updateOne(
        { _id: user._id },
        { $set: { failed_login_attempts: 0, locked_until: null } },
      );
    }

    return { user, ...(await this.createSession(user)) };
  }

  async refresh(presentedToken: string | undefined) {
    if (!presentedToken) {
      throw new AppError(401, 'Session has expired', 'INVALID_REFRESH_TOKEN');
    }

    const oldHash = hashRefreshToken(presentedToken);
    const nextToken = createRefreshToken();
    const nextHash = hashRefreshToken(nextToken);
    const oldToken = await RefreshToken.findOneAndUpdate(
      {
        token_hash: oldHash,
        revoked_at: mongoose.trusted({ $exists: false }),
        expires_at: mongoose.trusted({ $gt: new Date() }),
      },
      {
        $set: {
          revoked_at: new Date(),
          replaced_by_hash: nextHash,
        },
      },
      { returnDocument: 'before' },
    );

    if (!oldToken) {
      const reusedToken = await RefreshToken.findOne({ token_hash: oldHash });
      if (reusedToken) {
        await RefreshToken.updateMany(
          {
            user_id: reusedToken.user_id,
            revoked_at: mongoose.trusted({ $exists: false }),
          },
          { $set: { revoked_at: new Date() } },
        );
      }
      throw new AppError(401, 'Session has expired', 'INVALID_REFRESH_TOKEN');
    }

    const user = await User.findById(oldToken.user_id);
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(401, 'Session has expired', 'INVALID_REFRESH_TOKEN');
    }

    await RefreshToken.create({
      user_id: user._id,
      token_hash: nextHash,
      expires_at: new Date(
        Date.now() + env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
      ),
    });

    return {
      user,
      accessToken: signAccessToken(user.id, user.role, user.token_version),
      refreshToken: nextToken,
    };
  }

  async logout(presentedToken: string | undefined) {
    if (!presentedToken) {
      return;
    }
    await RefreshToken.updateOne(
      { token_hash: hashRefreshToken(presentedToken) },
      { $set: { revoked_at: new Date() } },
    );
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await User.findOne({
      email: normalizeEmail(input.email),
      role: 'BUYER',
      status: 'ACTIVE',
    });

    if (!user) {
      return {};
    }

    await PasswordResetToken.deleteMany({ user_id: user._id });
    const resetToken = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({
      user_id: user._id,
      token_hash: hashResetToken(resetToken),
      expires_at: new Date(
        Date.now() + env.resetTokenExpiresInMinutes * 60 * 1000,
      ),
    });

    const resetUrl = `${env.webUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    if (env.nodeEnv !== 'test') {
      // This is the handoff point for a transactional email provider.
      console.info(`Buyer password reset link: ${resetUrl}`);
    }

    return env.nodeEnv === 'test' ? { resetToken } : {};
  }

  async resetPassword(input: ResetPasswordInput) {
    const resetRecord = await PasswordResetToken.findOneAndDelete({
      token_hash: hashResetToken(input.token),
      expires_at: mongoose.trusted({ $gt: new Date() }),
    });

    if (!resetRecord) {
      throw new AppError(
        400,
        'This password reset link is invalid or has expired',
        'INVALID_RESET_TOKEN',
      );
    }

    const user = await User.findOne({
      _id: resetRecord.user_id,
      role: 'BUYER',
      status: 'ACTIVE',
    });
    if (!user) {
      throw new AppError(
        400,
        'This password reset link is invalid or has expired',
        'INVALID_RESET_TOKEN',
      );
    }

    user.password_hash = await hashPassword(input.password);
    // Invalidates every access token already issued for this user; deleting
    // refresh tokens alone would still leave a live token working until it
    // expired.
    user.token_version += 1;
    user.failed_login_attempts = 0;
    user.locked_until = null;
    await user.save();
    await PasswordResetToken.deleteMany({ user_id: user._id });
    await RefreshToken.deleteMany({ user_id: user._id });
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await User.findOne({
      _id: userId,
      role: 'BUYER',
      status: 'ACTIVE',
    }).select('+password_hash');

    if (
      !user ||
      !(await verifyPassword(input.currentPassword, user.password_hash))
    ) {
      throw new AppError(
        400,
        'Current password is incorrect',
        'INVALID_CURRENT_PASSWORD',
      );
    }

    user.password_hash = await hashPassword(input.newPassword);
    user.token_version += 1;
    await user.save();
    await RefreshToken.deleteMany({ user_id: user._id });
  }
}

export const authService = new AuthService();
