import { auth } from '@/lib/auth/config';
import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmailInsensitive } from '@/lib/db/users';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

export async function HEAD() {
  const session = await auth();
  if (!session?.user) {
    return new Response(null, { status: 401 });
  }
  return new Response(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ unverified: false });
    }
    const user = await getUserByEmailInsensitive(email.trim().toLowerCase());
    if (user && user.isActive && !user.emailVerified) {
      return NextResponse.json({ unverified: true });
    }
    return NextResponse.json({ unverified: false });
  } catch {
    return NextResponse.json({ unverified: false });
  }
}
