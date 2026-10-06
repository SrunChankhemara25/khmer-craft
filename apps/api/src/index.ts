import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import dbConnect, { ensureDatabaseCollections } from '../lib/mongodb';
import { createApp } from './app';
import { assertEnv, env } from './config/env';

/**
 * Locate .env.local by walking up from this file rather than resolving it
 * against the current working directory. Starting the server from the repo
 * root would otherwise load nothing at all and fail on the JWT_SECRET
 * assertion with no hint that the environment file was simply never found.
 *
 * Walking up also covers both layouts this file runs in: src/ under ts-node,
 * and dist/src/ after a build.
 */
const findEnvDir = () => {
  let directory = __dirname;

  while (true) {
    if (
      fs.existsSync(path.join(directory, '.env')) ||
      fs.existsSync(path.join(directory, '.env.local'))
    ) {
      return directory;
    }

    const parent = path.dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
};

const envDir = findEnvDir();
if (!envDir) {
  console.error(
    'Configuration error: neither .env nor .env.local found. Copy apps/api/.env.example to apps/api/.env.',
  );
  process.exit(1);
}

// Load .env first, then let .env.local override if present
const defaultEnvPath = path.join(envDir, '.env');
const localEnvPath = path.join(envDir, '.env.local');

if (fs.existsSync(defaultEnvPath)) {
  dotenv.config({ path: defaultEnvPath });
}
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
}

// Fail fast: a missing JWT_SECRET must stop the process here, not surface as a
// confusing 500 on the first login attempt.
try {
  assertEnv();
} catch (error) {
  console.error(`Configuration error: ${(error as Error).message}`);
  process.exit(1);
}

/** Warn at boot so operators fix delivery before users attempt sign-up. */
if (!env.isEmailConfigured) {
  const missing = (['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM'] as const).filter(
    (key) => !process.env[key],
  );
  console.warn(
    `[email] DISABLED — ${missing.join(', ')} not set in .env.local. ` +
      'No verification codes or password-reset emails can be sent. Sign-up will return ' +
      'an email-configuration error until this is fixed. Diagnose with: npm run check:email',
  );
}

const port = process.env.PORT || 3001;
const app = createApp();

dbConnect()
  .then(async () => {
    await ensureDatabaseCollections();
    app.listen(port, () => {
      console.log(`KhmerCraft API running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exitCode = 1;
  });
