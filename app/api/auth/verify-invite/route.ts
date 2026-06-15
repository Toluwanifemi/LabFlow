import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing verification token.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: 'Invalid or expired verification link.' }, { status: 400 });
    }

    if (verificationToken.usedAt) {
      return NextResponse.json({ error: 'This verification link has already been used.' }, { status: 400 });
    }

    if (new Date() > verificationToken.expiresAt) {
      return NextResponse.json({ error: 'This verification link has expired.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: verificationToken.email },
        data: {
          passwordHash,
          emailVerified: new Date(),
          onboardingCompleted: true,
        },
      }),
      prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      message: 'Email verified and password set. You can now log in.',
      email: verificationToken.email,
    });
  } catch (error) {
    console.error('[verify-invite] Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
