import { NextRequest, NextResponse } from 'next/server';
import { createLab } from '@/lib/db/labs';
import { getUserByEmail, createUser } from '@/lib/db/users';
import { sendWelcomeEmail } from '@/lib/email/mailer';
import bcrypt from 'bcryptjs';
import { Role } from '@/types';
import { z } from 'zod';
import { rateLimit } from '@/lib/api/rate-limit';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  labName: z.string().min(1, 'Lab name is required'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const limit = await rateLimit(`signup:${ip}`, 5, 60 * 1000);
    if (!limit.ok) return limit.response;

    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, labName } = parsed.data;

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const lab = await createLab(labName);

    const rawUser = await createUser({
      name,
      email,
      passwordHash,
      role: 'ADMIN' as Role,
      emailVerified: new Date(),
    }, lab.id);

    const user = { id: rawUser.id, name: rawUser.name, email: rawUser.email, role: rawUser.role };

    sendWelcomeEmail(email, name, labName).catch(err =>
      console.error('[signup] Welcome email failed:', err)
    );

    return NextResponse.json(
      { message: 'Registration successful.', user },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/auth/signup]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
