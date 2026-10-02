import crypto from 'node:crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
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
import { assertEmailConfigured, sendPasswordResetEmail, sendVerificationEmail } from '../../utils/email';
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

const GOOGLE_STATE_TTL_MS = 10 * 60 * 1000;

type GoogleState = { returnUrl: string; expiresAt: number };
type TelegramState = GoogleState & { codeVerifier: string };
type TelegramJwk = { kid?: string; kty?: string; n?: string; e?: string };

let telegramJwks: { keys: TelegramJwk[]; expiresAt: number } | null = null;

const safeReturnUrl = (value: string | undefined) =>
  value?.startsWith('/') && !value.startsWith('//') ? value : '/';

const signGoogleState = (payload: GoogleState) => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.jwtSecret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
};

const readGoogleState = (state: string): GoogleState => {
  const [encoded, signature, extra] = state.split('.');
  if (!encoded || !signature || extra) {
    throw new AppError(400, 'Google sign-in could not be verified', 'GOOGLE_OAUTH_INVALID');
  }
  const expected = crypto
    .createHmac('sha256', env.jwtSecret)
    .update(encoded)
    .digest('base64url');
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new AppError(400, 'Google sign-in could not be verified', 'GOOGLE_OAUTH_INVALID');
  }
  try {
    const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as GoogleState;
    if (!Number.isFinite(value.expiresAt) || value.expiresAt < Date.now()) {
      throw new Error('Expired state');
    }
    return { returnUrl: safeReturnUrl(value.returnUrl), expiresAt: value.expiresAt };
  } catch {
    throw new AppError(400, 'Google sign-in could not be verified', 'GOOGLE_OAUTH_INVALID');
  }
};

const assertGoogleConfigured = () => {
  if (!env.isGoogleOAuthConfigured) {
    throw new AppError(503, 'Google sign-in is temporarily unavailable.', 'GOOGLE_OAUTH_NOT_CONFIGURED');
  }
};

const assertTelegramConfigured = () => {
  if (!env.isTelegramOAuthConfigured) {
    throw new AppError(503, 'Telegram sign-in is temporarily unavailable.', 'TELEGRAM_OAUTH_NOT_CONFIGURED');
  }
};

const signTelegramState = (payload: TelegramState) => signGoogleState(payload);

const readTelegramState = (state: string): TelegramState => {
  const [encoded] = state.split('.');
  const verified = readGoogleState(state);
  try {
    const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TelegramState;
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(value.codeVerifier)) throw new Error('Invalid verifier');
    return { ...verified, codeVerifier: value.codeVerifier };
  } catch {
    throw new AppError(400, 'Telegram sign-in could not be verified', 'TELEGRAM_OAUTH_INVALID');
  }
};

const getTelegramSigningKey = async (kid: string) => {
  if (!telegramJwks || telegramJwks.expiresAt < Date.now()) {
    let response: Response;
    try {
      response = await fetch('https://oauth.telegram.org/.well-known/jwks.json');
    } catch {
      throw new AppError(503, 'Telegram sign-in is temporarily unavailable.', 'TELEGRAM_OAUTH_UNAVAILABLE');
    }
    const body = (await response.json().catch(() => null)) as { keys?: TelegramJwk[] } | null;
    if (!response.ok || !body?.keys?.length) {
      throw new AppError(503, 'Telegram sign-in is temporarily unavailable.', 'TELEGRAM_OAUTH_UNAVAILABLE');
    }
    telegramJwks = { keys: body.keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  }
  const key = telegramJwks.keys.find((candidate) => candidate.kid === kid && candidate.kty === 'RSA');
  if (!key) throw new AppError(401, 'Telegram sign-in could not be verified', 'TELEGRAM_OAUTH_FAILED');
  return crypto.createPublicKey({ key, format: 'jwk' });
};

/** Existing accounts created before OTP was enabled remain able to sign in. */
const isEmailAvailable = (): boolean => {
  try {
    assertEmailConfigured();
    return true;
  } catch {
    return false;
  }
};

/** Persist only the hash; never log or return the code. */
const issueVerificationCode = async (user: IUser) => {
  assertEmailConfigured();
  const code = generateVerificationCode();
  const record = await EmailVerificationCode.create({
    user_id: user._id,
    code_hash: hashVerificationCode(code),
    expires_at: new Date(
      Date.now() + VERIFICATION_CODE_EXPIRES_MINUTES * 60 * 1000,
    ),
  });

  try {
    await sendVerificationEmail(user.email, code);
  } catch (error) {
    await EmailVerificationCode.deleteOne({ _id: record._id });
    throw error;
  }
  // Keep the previous code usable if delivery fails.
  await EmailVerificationCode.deleteMany({ user_id: user._id, _id: mongoose.trusted({ $ne: record._id }) });
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

  googleAuthorizationUrl(returnUrl?: string) {
    assertGoogleConfigured();
    const state = signGoogleState({
      returnUrl: safeReturnUrl(returnUrl),
      expiresAt: Date.now() + GOOGLE_STATE_TTL_MS,
    });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: env.googleClientId!,
      redirect_uri: env.googleRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  async completeGoogleSignIn(input: { code: string; state: string }) {
    assertGoogleConfigured();
    if (!input.code) {
      throw new AppError(400, 'Google sign-in was cancelled or failed', 'GOOGLE_OAUTH_FAILED');
    }
    const state = readGoogleState(input.state);

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: input.code,
          client_id: env.googleClientId!,
          client_secret: env.googleClientSecret!,
          redirect_uri: env.googleRedirectUri,
          grant_type: 'authorization_code',
        }),
      });
    } catch {
      throw new AppError(503, 'Google sign-in is temporarily unavailable.', 'GOOGLE_OAUTH_UNAVAILABLE');
    }
    const token = (await tokenResponse.json().catch(() => null)) as { access_token?: string } | null;
    if (!tokenResponse.ok || !token?.access_token) {
      throw new AppError(401, 'Google sign-in could not be verified', 'GOOGLE_OAUTH_FAILED');
    }

    let profileResponse: Response;
    try {
      profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
    } catch {
      throw new AppError(503, 'Google sign-in is temporarily unavailable.', 'GOOGLE_OAUTH_UNAVAILABLE');
    }
    const profile = (await profileResponse.json().catch(() => null)) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
    } | null;
    if (!profileResponse.ok || !profile?.email || profile.email_verified !== true) {
      throw new AppError(401, 'Google did not provide a verified email address', 'GOOGLE_OAUTH_FAILED');
    }

    const email = normalizeEmail(profile.email);
    let user = await User.findOne({ email });
    if (user) {
      if (user.status !== 'ACTIVE') {
        throw new AppError(403, 'This account is not active', 'ACCOUNT_INACTIVE');
      }
      if (!user.email_verified) {
        user.email_verified = true;
        await user.save();
      }
    } else {
      user = await User.create({
        name: profile.name?.trim().slice(0, 100) || 'Google user',
        email,
        // Password login remains unavailable until the user chooses one with
        // the standard reset-password flow; this value cannot be guessed.
        password_hash: await hashPassword(crypto.randomBytes(48).toString('base64url')),
        role: 'BUYER',
        status: 'ACTIVE',
        email_verified: true,
      });
    }

    return { returnUrl: state.returnUrl, user, ...(await this.createSession(user)) };
  }

  telegramAuthorizationUrl(returnUrl?: string) {
    assertTelegramConfigured();
    const codeVerifier = crypto.randomBytes(48).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const state = signTelegramState({
      returnUrl: safeReturnUrl(returnUrl),
      codeVerifier,
      expiresAt: Date.now() + GOOGLE_STATE_TTL_MS,
    });
    const url = new URL('https://oauth.telegram.org/auth');
    url.search = new URLSearchParams({
      client_id: env.telegramClientId!,
      redirect_uri: env.telegramRedirectUri,
      response_type: 'code',
      scope: 'openid profile phone',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }).toString();
    return url.toString();
  }

  async completeTelegramSignIn(input: { code: string; state: string }) {
    assertTelegramConfigured();
    if (!input.code) throw new AppError(400, 'Telegram sign-in was cancelled or failed', 'TELEGRAM_OAUTH_FAILED');
    const state = readTelegramState(input.state);
    let tokenResponse: Response;
    try {
      tokenResponse = await fetch('https://oauth.telegram.org/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${env.telegramClientId!}:${env.telegramClientSecret!}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: input.code,
          redirect_uri: env.telegramRedirectUri,
          client_id: env.telegramClientId!,
          code_verifier: state.codeVerifier,
        }),
      });
    } catch {
      throw new AppError(503, 'Telegram sign-in is temporarily unavailable.', 'TELEGRAM_OAUTH_UNAVAILABLE');
    }
    const token = (await tokenResponse.json().catch(() => null)) as { id_token?: string } | null;
    if (!tokenResponse.ok || !token?.id_token) {
      throw new AppError(401, 'Telegram sign-in could not be verified', 'TELEGRAM_OAUTH_FAILED');
    }

    const decoded = jwt.decode(token.id_token, { complete: true });
    if (!decoded || typeof decoded === 'string' || decoded.header.alg !== 'RS256' || !decoded.header.kid) {
      throw new AppError(401, 'Telegram sign-in could not be verified', 'TELEGRAM_OAUTH_FAILED');
    }
    let claims: JwtPayload & { sub?: string; name?: string; phone_number?: string; phone_number_verified?: boolean };
    try {
      claims = jwt.verify(token.id_token, await getTelegramSigningKey(decoded.header.kid), {
        algorithms: ['RS256'],
        issuer: 'https://oauth.telegram.org',
        audience: env.telegramClientId!,
      }) as JwtPayload & { sub?: string; name?: string; phone_number?: string; phone_number_verified?: boolean };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(401, 'Telegram sign-in could not be verified', 'TELEGRAM_OAUTH_FAILED');
    }
    if (!claims.sub) throw new AppError(401, 'Telegram sign-in could not be verified', 'TELEGRAM_OAUTH_FAILED');

    let user = await User.findOne({ telegram_id: claims.sub });
    if (user) {
      if (user.status !== 'ACTIVE') throw new AppError(403, 'This account is not active', 'ACCOUNT_INACTIVE');
    } else {
      user = await User.create({
        name: claims.name?.trim().slice(0, 100) || 'Telegram user',
        // Telegram does not provide email. This private placeholder satisfies
        // the existing email-backed account model without exposing it publicly.
        email: `telegram-${claims.sub}@telegram.local`,
        password_hash: await hashPassword(crypto.randomBytes(48).toString('base64url')),
        ...(claims.phone_number_verified && claims.phone_number ? { phone: claims.phone_number } : {}),
        telegram_id: claims.sub,
        role: 'BUYER',
        status: 'ACTIVE',
        email_verified: false,
      });
    }
    return { returnUrl: state.returnUrl, user, ...(await this.createSession(user)) };
  }

  /** Create an unverified account; only code confirmation starts a session. */
  async register(input: RegisterInput) {
    const email = normalizeEmail(input.email);
    if (await User.exists({ email })) {
      throw new AppError(
        409,
        'An account with this email already exists',
        'EMAIL_IN_USE',
      );
    }

    // Do this before creating a user. A registration must never appear to
    // succeed while its required verification email cannot be delivered.
    assertEmailConfigured();

    const user = await User.create({
      name: input.name,
      email,
      password_hash: await hashPassword(input.password),
      phone: input.phone,
      role: 'BUYER',
      status: 'ACTIVE',
      email_verified: false,
    });

    try {
      await issueVerificationCode(user);
    } catch (error) {
      await User.deleteOne({ _id: user._id, email_verified: false });
      throw error;
    }
    return { requiresVerification: true as const, email: user.email };
  }

  /** Confirms the code and, only then, starts the session. */
  async verifyEmail(input: VerifyEmailInput) {
    const user = await User.findOne({ email: normalizeEmail(input.email) });
    if (!user) {
      throw new AppError(400, 'Invalid or expired code', 'INVALID_CODE');
    }

    if (user.email_verified || user.status !== 'ACTIVE') {
      throw new AppError(400, 'Invalid or expired code. If already verified, sign in.', 'INVALID_CODE');
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

    const consumed = await EmailVerificationCode.deleteOne({ _id: record._id, code_hash: record.code_hash, attempts: mongoose.trusted({ $lt: MAX_VERIFICATION_ATTEMPTS }) });
    if (!consumed.deletedCount) throw new AppError(400, 'Invalid or expired code', 'INVALID_CODE');
    user.email_verified = true;
    await user.save();
    await EmailVerificationCode.deleteMany({ user_id: user._id });

    return { user, ...(await this.createSession(user)) };
  }

  /** Same response whether or not the account exists — no account enumeration. */
  async resendCode(input: ResendCodeInput) {
    const user = await User.findOne({ email: normalizeEmail(input.email) });
    if (user && !user.email_verified) {
      await issueVerificationCode(user);
    }
    return {};
  }

  /**
   * Register-as-seller: create the account (or upgrade an existing buyer's)
   * and its Store in one step, then sign in immediately.
   *
   * A brand-new email is created pre-verified and signed in right away,
   * same as `register()`'s own fallback when no email provider is
   * configured — gating this on a code nothing can deliver would just be
   * the same dead end twice. An *existing* buyer being upgraded only needs
   * to already be verified once a real provider exists to have verified
   * them with (see isEmailAvailable); before that, verification was
   * never possible in the first place, so it is not required here either.
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
      if (existingUser.status !== 'ACTIVE') {
        throw new AppError(403, 'This account is not active.', 'ACCOUNT_INACTIVE');
      }
      // Only enforced once a real email provider exists to have verified
      // them with in the first place — see isEmailAvailable above.
      if (isEmailAvailable() && !existingUser.email_verified) {
        throw new AppError(403, 'Verify your email before creating a store.', 'EMAIL_NOT_VERIFIED');
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

    // Only enforced once a real email provider exists to have verified them
    // with in the first place — see isEmailAvailable above. An account
    // created before email verification existed, or while it was
    // unconfigured, is not retroactively locked out.
    if (isEmailAvailable() && !user.email_verified) {
      throw new AppError(403, 'Verify your email before signing in.', 'EMAIL_NOT_VERIFIED');
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

    if (isEmailAvailable()) {
      // Delivery failures are swallowed on purpose: this endpoint always
      // answers the same way regardless of whether the address exists, and
      // surfacing "we couldn't email you" would break that by confirming it
      // does. The token stays valid, so a retry still works.
      try {
        await sendPasswordResetEmail(user.email, resetUrl, env.resetTokenExpiresInMinutes);
      } catch (error) {
        console.error('[auth] password reset email failed to send:', error);
      }
    } else if (env.nodeEnv !== 'test') {
      // No SMTP configured (see utils/email.ts) — fall back to the console so
      // local development still has a way to reach the link.
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
