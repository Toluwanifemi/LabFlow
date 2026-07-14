import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getSamplesWithoutQR, updateSampleQR } from '@/lib/db/samples';
import { generateQRCodeUrl } from '@/lib/qr/goqr';

export async function POST(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const samples = await getSamplesWithoutQR(session.user.labId);

    let retried = 0;
    let failed = 0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const batchSize = 5;
    for (let i = 0; i < samples.length; i += batchSize) {
      const batch = samples.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (sample) => {
          try {
            const qrCodeUrl = generateQRCodeUrl(`${appUrl}/samples/${sample.id}`);
            await updateSampleQR(sample.id, qrCodeUrl, session.user.labId);
            retried++;
          } catch (err) {
            console.error(`[POST /api/qr/retry] QR update failed for sample ${sample.id}:`, err);
            failed++;
          }
        })
      );
    }

    return NextResponse.json({ retried, failed, total: samples.length }, { status: 200 });
  } catch (error) {
    console.error('[POST /api/qr/retry]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
