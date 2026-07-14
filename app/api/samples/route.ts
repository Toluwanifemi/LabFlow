import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { createSample, getNextSampleSequence, updateSampleQR, getSampleByHumanId, querySamples, checkSlugExistsGlobally } from '@/lib/db/samples';
import { createReplicates } from '@/lib/db/replicates';
import { writeAuditLog } from '@/lib/db/audit';
import { createSampleSchema } from '@/lib/validators/sample';
import { generateHumanId, generateSlug, generateSlugWithFallback } from '@/lib/id/generateId';
import { generateQRCodeUrl } from '@/lib/qr/goqr';
import { getIpAddress } from '@/lib/api/utils';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.labId || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userLabId = session.user.labId;
    const userRole = session.user.role;
    if (!canPerformAction(userRole as any, 'create_sample')) {
      return NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createSampleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const { childCount, parentHumanId: _parentHumanId, ...dbData } = data;

    if (childCount && childCount > 1) {
      let replicates: any[] = [];
      let replicateAttempts = 0;
      const maxReplicateAttempts = 3;
      while (replicateAttempts < maxReplicateAttempts) {
        try {
          const seq = await getNextSampleSequence(userLabId, dbData.sampleType);
          const baseHumanId = generateHumanId(dbData.sampleType, seq);
          const baseSlug = generateSlug(dbData.sampleType, baseHumanId);

          replicates = await createReplicates(
            baseHumanId, baseSlug, childCount, dbData, userId, userLabId,
          );
          break;
        } catch (err: unknown) {
          if (
            err && typeof err === 'object' && 'code' in err &&
            (err as { code: unknown }).code === 'P2002'
          ) {
            replicateAttempts++;
            if (replicateAttempts >= maxReplicateAttempts) throw err;
            await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
          } else {
            throw err;
          }
        }
      }

      for (const r of replicates!) {
        await writeAuditLog({ userId, actionType: 'CREATE', sampleId: r.id, ipAddress: getIpAddress(req), labId: userLabId });
      }

      const parent = replicates[0];
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      try {
        const qrCodeUrl = generateQRCodeUrl(`${appUrl}/samples/${parent.id}`);
        await updateSampleQR(parent.id, qrCodeUrl, userLabId);
      } catch (err) {
        console.error('[POST /api/samples] QR generation failed for parent:', err);
      }

      return NextResponse.json({ parent, children: replicates.slice(1) }, { status: 201 });
    }

    let sample;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        const seq = await getNextSampleSequence(userLabId, dbData.sampleType);
        const humanId = generateHumanId(dbData.sampleType, seq);

        let slug = generateSlug(dbData.sampleType, humanId);
        let slugAttempts = 0;
        while (slugAttempts < 3) {
          const slugExists = await checkSlugExistsGlobally(slug);
          if (!slugExists) break;
          slug = slugAttempts === 0
            ? generateSlugWithFallback(dbData.sampleType, humanId)
            : generateSlugWithFallback(dbData.sampleType, humanId) + '-' + Math.random().toString(36).slice(2, 5);
          slugAttempts++;
        }

        sample = await createSample(dbData, userId, userLabId, slug, humanId);
        break;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === 'P2002') {
          attempts++;
          if (attempts >= maxAttempts) throw err;
          await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
        } else {
          throw err;
        }
      }
    }

    if (!sample) {
      throw new Error('Failed to create sample after max attempts.');
    }

    await writeAuditLog({
      userId,
      actionType: 'CREATE',
      sampleId: sample.id,
      ipAddress: getIpAddress(req),
      labId: userLabId,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
      const qrCodeUrl = generateQRCodeUrl(`${appUrl}/samples/${sample.id}`);
      const updatedSample = await updateSampleQR(sample.id, qrCodeUrl, userLabId);
      sample = updatedSample;
    } catch (err) {
      console.error('[POST /api/samples] QR generation failed during sync create:', err);
    }

    return NextResponse.json(sample, { status: 201 });

  } catch (error) {
    console.error('[POST /api/samples]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.labId || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userLabId = session.user.labId;
    const userRole = session.user.role;

    if (!canPerformAction(userRole as any, 'view_all_samples') && !canPerformAction(userRole as any, 'view_own_samples')) {
      return NextResponse.json(
        { error: 'You do not have permission to view samples.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const humanIdParam = searchParams.get('humanId');

    if (humanIdParam) {
      const sample = await getSampleByHumanId(humanIdParam, userLabId);
      if (!sample) {
        return NextResponse.json({ error: 'This sample does not exist.' }, { status: 404 });
      }
      return NextResponse.json(sample, { status: 200 });
    }

    const q = searchParams.get('q')?.trim() || undefined;
    const sampleType = searchParams.get('sampleType')?.trim() || undefined;
    const sort = (searchParams.get('sort') as any) || 'newest';
    const archived = searchParams.get('archived') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const attention = searchParams.get('attention') || undefined;

    const { samples, total } = await querySamples(userLabId, {
      q,
      sampleType,
      sort,
      archived,
      page,
      limit,
      attention,
    });
    
    return NextResponse.json({ data: samples, total, page, limit }, { status: 200 });

  } catch (error) {
    console.error('[GET /api/samples]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
