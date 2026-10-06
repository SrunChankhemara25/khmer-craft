/**
 * Create (or reset the password of) a KhmerCraft admin account.
 *
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 *
 * The password is typed at a hidden prompt, or read from ADMIN_PASSWORD for
 * scripted use, so it never lands in shell history or in the repository.
 *
 * An existing BUYER or SELLER account is NOT turned into an admin unless you
 * pass --promote: an account has one role, so promoting a seller locks them
 * out of their seller dashboard.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import readline from 'readline';
import User from '../models/User';
import { hashPassword } from '../src/utils/password';

dotenv.config({ path: '.env.local' });

const arg = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

/** Same rules as sign-up (auth.validation.ts). */
const passwordProblem = (password: string) => {
  if (password.length < 8) return 'must be at least 8 characters';
  if (password.length > 72) return 'must be at most 72 characters';
  if (!/[a-z]/.test(password)) return 'must include a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'must include an uppercase letter';
  if (!/\d/.test(password)) return 'must include a number';
  return null;
};

/** Read a line without echoing it to the terminal. */
const askHidden = (question: string) =>
  new Promise<string>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    output._writeToOutput = (s: string) => {
      if (s.includes(question)) output.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });

const main = async () => {
  const email = arg('email')?.trim().toLowerCase();
  const name = arg('name')?.trim() || 'KhmerCraft Admin';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: npm run admin:create -- --email you@example.com --name "Your Name" [--promote]');
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured in .env.local');

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await askHidden(`Password for ${email}: `);
    const again = await askHidden('Type it again: ');
    if (password !== again) throw new Error('The two passwords do not match.');
  }
  const problem = passwordProblem(password);
  if (problem) throw new Error(`Password ${problem}.`);

  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });

  const existing = await User.findOne({ email });
  if (existing && existing.role !== 'ADMIN' && !flag('promote')) {
    throw new Error(
      `${email} is already a ${existing.role} account. Use a different email for the admin, ` +
        'or add --promote to turn this account into an admin (it will lose its ' +
        `${existing.role.toLowerCase()} access).`,
    );
  }

  await User.updateOne(
    { email },
    {
      $set: {
        email,
        name,
        role: 'ADMIN',
        status: 'ACTIVE',
        email_verified: true,
        password_hash: await hashPassword(password),
        failed_login_attempts: 0,
        locked_until: null,
      },
      // A password reset should sign out sessions using the old one.
      $inc: { token_version: existing ? 1 : 0 },
    },
    { upsert: true },
  );

  console.log(existing ? `Updated admin ${email}.` : `Created admin ${email}.`);
  console.log('Sign in at /admin/login.');
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
