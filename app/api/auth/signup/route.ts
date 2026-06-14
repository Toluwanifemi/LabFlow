import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { sendWelcomeEmail } from '@/lib/email/mailer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  labName: z.string().min(1, 'Lab name is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, labName } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const lab = await prisma.lab.create({
      data: { name: labName },
    });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'ADMIN',
        labId: lab.id,
      },
      select: { id: true, name: true, email: true, role: true },
    });

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
