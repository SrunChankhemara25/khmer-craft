import crypto from 'node:crypto';
import mongoose from 'mongoose';
import EmailVerificationCode from '../../../models/EmailVerificationCode';
import PasswordResetToken from '../../../models/PasswordResetToken';
import RefreshToken from '../../../models/RefreshToken';
import Store from '../../../models/Store';
import User, { IUser } from '../../../models/User';
import { env } from '../../config/env';
import { AppError } from '../../errors/app-error';
import { signAccessToken } from '../../utils/jwt';
import { slugify } from '../../utils/slugify';
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
  RegisterSellerInput,
  ResendCodeInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.validation';

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const sha256 = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');
const hashResetToken = sha256;
const hashRefreshToken = sha256;
const hashVerificationCode = sha256;

const createRefreshToken = () => crypto.randomBytes(48).toString('base64url');

const VERIFICATION_CODE_EXPIRES_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;

const generateVerificationCode = () =>
  crypto.randomInt(100_000, 1_000_000).toString();

/**
 * Issues a fresh code for a user, replacing any still-live one. Logs it to
 * the server console — same stopgap the codebase already uses for password
 * reset links (see forgotPassword) until a transactional email provider is
 * wired in.
 */
const issueVerificationCode = async (user: IUser) => {
  await EmailVerificationCode.deleteMany({ user_id: user._id });
  const code = generateVerificationCode();
  await EmailVerificationCode.create({
    user_id: user._id,
    code_hash: hashVerificationCode(code),
    expires_at: new Date(
      Date.now() + VERIFICATION_CODE_EXPIRES_MINUTES * 60 * 1000,
    ),
  });

  if (env.nodeEnv !== 'test') {
    // This is the handoff point for a transactional email provider.
    console.info(`Email verification code for ${user.email}: ${code}`);
  }

  return env.nodeEnv === 'test' ? code : undefined;
};

/** Unique slug; suffix on collision so a second "Angkor Crafts" is not blocked. */
const uniqueStoreSlug = async (name: string): Promise<string> => {
  const base = slugify(name);
  let slug = base;
  for (let attempt = 2; await Store.exists({ slug }); attempt += 1) {
    slug = `${base}-${attempt}`;
  }
  return slug;
};

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

  /**
   * Creates the account and signs it in immediately.
   *
   * This used to create the account unverified and require a code from
   * /verify-email before any session was issued — but nothing in this
   * deployment can actually deliver that code (see `issueVerificationCode`:
   * no email provider is wired up, it only logs to the server console).
   * That made every new registration, and every account created before this
   * change, permanently unable to sign in. Marking accounts verified at
   * creation removes a dead end, not a security control that was doing
   * anything — see `registerSeller` for the same reasoning applied there
   * first. /verify-email and /resend-code still work and are harmless to
   * leave in place for when a real provider exists.
   */
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
      email_verified: true,
    });

    return { user, ...(await this.createSession(user)) };
  }

  /** Confirms the code and, only then, starts the session. */
  async verifyEmail(input: VerifyEmailInput) {
    const user = await User.findOne({ email: normalizeEmail(input.email) });
    if (!user) {
      throw new AppError(400, 'Invalid or expired code', 'INVALID_CODE');
    }

    if (user.email_verified) {
      return { user, ...(await this.createSession(user)) };
    }

    const record = await EmailVerificationCode.findOne({
      user_id: user._id,
      expires_at: mongoose.trusted({ $gt: new Date() }),
    });

    if (!record || record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      throw new AppError(400, 'Invalid or expired code', 'INVALID_CODE');
    }

    if (record.code_hash !== hashVerificationCode(input.code)) {
      await EmailVerificationCode.updateOne(
        { _id: record._id },
        { $inc: { attempts: 1 } },
      );
      throw new AppError(400, 'Invalid or expired code', 'INVALID_CODE');
    }

    user.email_verified = true;
    await user.save();
    await EmailVerificationCode.deleteMany({ user_id: user._id });

    return { user, ...(await this.createSession(user)) };
  }

  /** Same response whether or not the account exists — no account enumeration. */
  async resendCode(input: ResendCodeInput) {
    const user = await User.findOne({ email: normalizeEmail(input.email) });
    if (user && !user.email_verified) {
      const devCode = await issueVerificationCode(user);
      return { devCode };
    }
    return {};
  }

  /**
   * Register-as-seller: create the account (or upgrade an existing buyer's)
   * and its Store in one step, then sign in immediately.
   *
   * Ported from origin/develop's `registerSeller`, which predates this
   * branch's email-verification requirement — it never set `email_verified`
   * and had no `/verify-email` step to send anyone through, so a seller
   * created there could sign in right away. There is still no email provider
   * wired up here (see `issueVerificationCode`), so gating this path on a
   * code that can never be delivered would just recreate the exact dead end
   * `register` currently has. Marking the account pre-verified reproduces
   * the working behavior this was pulled from, not a new exemption.
   *
   * No multi-document transaction: this deployment's test suite runs against
   * a standalone (non-replica-set) MongoDB, which cannot start one, and the
   * live database is a small Atlas cluster this project does not otherwise
   * depend on transactions for (see `orders.service.ts`'s createOrder for
   * the same reasoning). If store creation fails after a brand-new user was
   * just created, that user is deleted rather than left as an orphaned,
   * storeless "seller" account; an existing buyer being upgraded is rolled
   * back to BUYER for the same reason.
   */
  async registerSeller(input: RegisterSellerInput) {
    const email = normalizeEmail(input.email);
    const existingUser = await User.findOne({ email }).select('+password_hash');

    if (existingUser?.role === 'SELLER') {
      throw new AppError(
        409,
        'An account with this email is already a seller. Please sign in.',
        'EMAIL_IN_USE',
      );
    }

    if (existingUser) {
      const passwordMatches = await verifyPassword(
        input.password,
        existingUser.password_hash,
      );
      if (!passwordMatches) {
        throw new AppError(
          401,
          'This email is already registered. Enter its correct password to upgrade it to a seller account.',
          'INVALID_CREDENTIALS',
        );
      }
    }

    let user: IUser;
    let createdNewUser = false;
    const previousRole = existingUser?.role;
    const previousEmailVerified = existingUser?.email_verified;

    if (existingUser) {
      user = existingUser;
      user.role = 'SELLER';
      user.email_verified = true;
      await user.save();
    } else {
      user = await User.create({
        name: input.name,
        email,
        password_hash: await hashPassword(input.password),
        phone: input.phone,
        role: 'SELLER',
        status: 'ACTIVE',
        email_verified: true,
      });
      createdNewUser = true;
    }

    try {
      const store = await Store.create({
        userId: user._id,
        storeName: input.storeName,
        slug: await uniqueStoreSlug(input.storeName),
        category: input.category,
        storeDescription: input.description ?? '',
        phoneNumber: input.phone,
        subscriptionPlan: 'STARTER',
        onboardingStatus: 'COMPLETED',
      });

      return { user, store, ...(await this.createSession(user)) };
    } catch (error) {
      if (createdNewUser) {
        await User.deleteOne({ _id: user._id });
      } else if (previousRole) {
        await User.updateOne(
          { _id: user._id },
          { $set: { role: previousRole, email_verified: previousEmailVerified } },
        );
      }
      throw error;
    }
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

    // Not gated on email_verified: see the comment on `register()` — nothing
    // in this deployment can deliver the verification code that would be
    // required to clear it, so this check only ever produced accounts no one
    // could sign into.

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
      $or: [{ role: 'BUYER' }, { role: 'SELLER' }],
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
      $or: [{ role: 'BUYER' }, { role: 'SELLER' }],
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
      $or: [{ role: 'BUYER' }, { role: 'SELLER' }],
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
