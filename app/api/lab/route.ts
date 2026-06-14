import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { updateLabSettings } from '@/lib/db/labs';

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(session.user.role, 'edit_lab_settings')) {
      return NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, institution } = body;

    const updated = await updateLabSettings(session.user.labId, { name, institution });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('[PATCH /api/lab]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
