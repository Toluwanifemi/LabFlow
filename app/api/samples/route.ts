import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { createSample, getNextSampleSequence, updateSampleQR, getSamplesForLab, getSamplesCountForLab, getSampleByHumanId, getSampleBySlug, querySamples } from '@/lib/db/samples';
import { createReplicates } from '@/lib/db/replicates';
import { writeAuditLog } from '@/lib/db/audit';
import { getUserByEmailWithLab } from '@/lib/db/users';
import { createSampleSchema } from '@/lib/validators/sample';
import { generateHumanId, generateSlug, generateSlugWithFallback } from '@/lib/id/generateId';
import { generateQRCodeUrl } from '@/lib/qr/goqr';
import { getIpAddress } from '@/lib/api/utils';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getUserByEmailWithLab(session.user.email);

    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 });
    }

    if (!canPerformAction(dbUser.role, 'create_sample')) {
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
      let replicates: any[];
      let replicateAttempts = 0;
      const maxReplicateAttempts = 3;
      while (replicateAttempts < maxReplicateAttempts) {
        try {
          const seq = await getNextSampleSequence(dbUser.labId, dbData.sampleType);
          const baseHumanId = generateHumanId(dbData.sampleType, seq);
          const baseSlug = generateSlug(dbData.sampleType, baseHumanId);

          replicates = await createReplicates(
            baseHumanId, baseSlug, childCount, dbData, dbUser.id, dbUser.labId,
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
        await writeAuditLog({ userId: dbUser.id, actionType: 'CREATE', sampleId: r.id, ipAddress: getIpAddress(req) });
      }

      const parent = replicates![0];
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      try {
        const qrCodeUrl = await Promise.race([
          generateQRCodeUrl(`${appUrl}/samples/${parent.id}`),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('QR Timeout')), 1500)),
        ]);
        await updateSampleQR(parent.id, qrCodeUrl, dbUser.labId);
      } catch (err) {
        console.error('[POST /api/samples] QR generation failed for parent:', err);
      }

      return NextResponse.json({ parent, children: replicates!.slice(1) }, { status: 201 });
    }

    let sample;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        const seq = await getNextSampleSequence(dbUser.labId, dbData.sampleType);
        const humanId = generateHumanId(dbData.sampleType, seq);

        let slug = generateSlug(dbData.sampleType, humanId);
        let slugAttempts = 0;
        while (slugAttempts < 3) {
          const existingSlug = await getSampleBySlug(slug, dbUser.labId);
          if (!existingSlug) break;
          slug = slugAttempts === 0
            ? generateSlugWithFallback(dbData.sampleType, humanId)
            : generateSlugWithFallback(dbData.sampleType, humanId) + '-' + Math.random().toString(36).slice(2, 5);
          slugAttempts++;
        }

        sample = await createSample(dbData, dbUser.id, dbUser.labId, slug, humanId);
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
      userId: dbUser.id,
      actionType: 'CREATE',
      sampleId: sample.id,
      ipAddress: getIpAddress(req),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('QR Generation Timeout')), 1500)
      );
      const qrCodeUrl = await Promise.race([
        generateQRCodeUrl(`${appUrl}/samples/${sample.id}`),
        timeoutPromise,
      ]);
      const updatedSample = await updateSampleQR(sample.id, qrCodeUrl, dbUser.labId);
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
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await getUserByEmailWithLab(session.user.email);

    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 });
    }

    if (!canPerformAction(dbUser.role, 'view_all_samples') && !canPerformAction(dbUser.role, 'view_own_samples')) {
      return NextResponse.json(
        { error: 'You do not have permission to view samples.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const humanIdParam = searchParams.get('humanId');

    if (humanIdParam) {
      const sample = await getSampleByHumanId(humanIdParam, dbUser.labId);
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

    const { samples, total } = await querySamples(dbUser.labId, {
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
