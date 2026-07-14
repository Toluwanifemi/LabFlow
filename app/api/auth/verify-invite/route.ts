import { NextRequest, NextResponse } from 'next/server';
import { getVerificationToken, verifyUserByEmail } from '@/lib/db/users';
import bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/api/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const limit = await rateLimit(`verify-invite:${ip}`, 10, 60 * 1000);
    if (!limit.ok) return limit.response;

    const { token, password } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing verification token.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const verificationToken = await getVerificationToken(token);

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

    await verifyUserByEmail(verificationToken.email, passwordHash, verificationToken.id);

    return NextResponse.json({
      message: 'Email verified and password set. You can now log in.',
      email: verificationToken.email,
    });
  } catch (error) {
    console.error('[verify-invite] Error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
