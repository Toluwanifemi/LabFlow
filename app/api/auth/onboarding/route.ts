import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { updateLabSettings } from '@/lib/db/labs';
import { completeUserOnboarding } from '@/lib/db/users';
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

    await updateLabSettings(session.user.labId, { institution, researchFields });
    await completeUserOnboarding(session.user.id, {
      ...(role ? { role } : {}),
      onboardingCompleted: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/auth/onboarding]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
