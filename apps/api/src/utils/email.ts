import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';

export function assertEmailConfigured() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPassword || !env.mailFrom) {
    throw new AppError(503, 'Email verification is temporarily unavailable. Please try again later.', 'EMAIL_NOT_CONFIGURED');
  }
}

export async function sendVerificationEmail(email: string, code: string) {
  assertEmailConfigured();
  const transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    requireTLS: env.smtpPort !== 465,
    auth: { user: env.smtpUser, pass: env.smtpPassword },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  try {
    const result = await transport.sendMail({
      from: env.mailFrom,
      to: email,
      subject: 'Your KhmerCraft verification code',
      text: `Your KhmerCraft verification code is ${code}. It expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.`,
    });
    if (!result.accepted.length || result.rejected.length) throw new Error('Recipient rejected');
  } catch {
    // Never expose SMTP credentials, recipient details, or verification codes.
    throw new AppError(503, 'We could not send your verification email. Please try again shortly.', 'EMAIL_DELIVERY_FAILED');
  } finally {
    transport.close();
  }
}
