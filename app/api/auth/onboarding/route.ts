import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';

const onboardingSchema = z.object({
  institution: z.string().optional().default(''),
  researchFields: z.array(z.string()).optional().default([]),
  role: z.enum(['ADMIN', 'RESEARCHER', 'STUDENT', 'PI']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { institution, researchFields, role } = parsed.data;

    await prisma.$transaction([
      prisma.lab.update({
        where: { id: session.user.labId },
        data: { institution, researchFields },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(role ? { role } : {}),
          onboardingCompleted: true,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/auth/onboarding]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
