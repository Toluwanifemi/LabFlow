import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing reset token.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
    }

    if (resetToken.usedAt) {
      return NextResponse.json({ error: 'This reset link has already been used.' }, { status: 400 });
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ error: 'This reset link has expired.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('[reset-password] Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
