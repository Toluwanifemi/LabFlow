import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { sendPasswordResetEmail } from '@/lib/email/mailer';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalisedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email: { equals: normalisedEmail, mode: 'insensitive' } },
    });

    if (!user) {
      return NextResponse.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        email: normalisedEmail,
        token,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth?mode=reset-password&token=${token}`;

    await sendPasswordResetEmail(normalisedEmail, resetUrl);

    return NextResponse.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('[forgot-password] Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
