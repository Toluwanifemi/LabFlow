import { auth } from '@/lib/auth/config';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ unverified: false });
    }
    const user = await prisma.user.findFirst({
      where: { email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } },
      select: { emailVerified: true, isActive: true },
    });
    if (user && user.isActive && !user.emailVerified) {
      return NextResponse.json({ unverified: true });
    }
    return NextResponse.json({ unverified: false });
  } catch {
    return NextResponse.json({ unverified: false });
  }
}
