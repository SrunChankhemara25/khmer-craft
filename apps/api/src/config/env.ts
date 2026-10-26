const asPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  get nodeEnv() {
    return process.env.NODE_ENV ?? 'development';
  },
  /**
   * Required in EVERY environment, not just production. A committed fallback
   * secret means anyone who can read the repository can mint an ADMIN token,
   * and an environment that simply forgets to set NODE_ENV would silently use
   * it. Failing to boot is the safe outcome.
   */
  get jwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET must be set and at least 32 characters. Generate one with: openssl rand -hex 32',
      );
    }
    return secret;
  },
  get jwtExpiresInSeconds() {
    return asPositiveNumber(process.env.JWT_EXPIRES_IN_SECONDS, 7 * 24 * 60 * 60);
  },
  get refreshTokenExpiresInDays() {
    return asPositiveNumber(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS, 7);
  },
  get resetTokenExpiresInMinutes() {
    return asPositiveNumber(process.env.RESET_TOKEN_EXPIRES_IN_MINUTES, 30);
  },
  get webUrl() {
    return process.env.WEB_URL ?? 'http://localhost:4200';
  },
  get allowedOrigins() {
    return (process.env.CORS_ALLOWED_ORIGINS ?? this.webUrl)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  },
  get isProduction() {
    return this.nodeEnv === 'production';
  },
  get trustProxy() {
    return process.env.TRUST_PROXY === 'true';
  },
  get maxFailedLogins() {
    return asPositiveNumber(process.env.MAX_FAILED_LOGINS, 5);
  },
  get accountLockMinutes() {
    return asPositiveNumber(process.env.ACCOUNT_LOCK_MINUTES, 15);
  },
};

/**
 * Touch every required setting at boot so a misconfigured environment fails
 * immediately and loudly, instead of at the first login attempt.
 */
export const assertEnv = () => {
  void env.jwtSecret;
};
