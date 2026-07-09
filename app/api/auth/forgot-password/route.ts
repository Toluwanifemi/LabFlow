import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmailInsensitive, createPasswordResetToken } from '@/lib/db/users';
import { sendPasswordResetEmail } from '@/lib/email/mailer';
import crypto from 'crypto';
import { rateLimit } from '@/lib/api/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const limit = rateLimit(`forgot-password:${ip}`, 3, 60 * 1000);
    if (!limit.ok) return limit.response;

    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalisedEmail = email.trim().toLowerCase();

    const user = await getUserByEmailInsensitive(normalisedEmail);

    if (!user) {
      return NextResponse.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await createPasswordResetToken(normalisedEmail, token, expiresAt);

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth?mode=reset-password&token=${token}`;

    sendPasswordResetEmail(normalisedEmail, resetUrl).catch(err =>
      console.error('[forgot-password] Failed to send password reset email:', err)
    );

    return NextResponse.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('[forgot-password] Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
