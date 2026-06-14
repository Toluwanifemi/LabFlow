import Link from 'next/link';
import { auth } from '@/lib/auth/config';
import { getSampleById, getSampleBySlug, updateSampleQR, getChildSamples } from '@/lib/db/samples';
import { prisma } from '@/lib/db/client';
import { notFound } from 'next/navigation';
import { SampleDetail } from '@/components/samples/SampleDetail';
import { ImageAttachment } from '@/components/samples/ImageAttachment';
import { generateQRCodeUrl } from '@/lib/qr/goqr';
import styles from './sampleDetail.module.css';

export default async function SampleDetailPage(props: { params: Promise<{ id: string }> | { id: string } }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return null;

  let sample = await getSampleById(params.id, session.user.labId);
  if (!sample) {
    sample = await getSampleBySlug(params.id, session.user.labId);
    if (!sample) return notFound();
  }

  const childSamples = await getChildSamples(sample.id, session.user.labId);

  let parentSample = null;
  if (sample.parentSampleId) {
    parentSample = await prisma.sample.findUnique({
      where: { id: sample.parentSampleId },
      select: { id: true, humanId: true },
    });
  }

  if (!sample.qrCodeUrl) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
      const qrCodeUrl = await generateQRCodeUrl(`${appUrl}/samples/${sample.id}`);
      await updateSampleQR(sample.id, qrCodeUrl, session.user.labId);
      sample.qrCodeUrl = qrCodeUrl;
    } catch (err) {
      console.error('[SampleDetailPage] QR self-healing generation failed:', err);
    }
  }

  return (
    <div className={styles.container}>
      <Link href="/samples" prefetch={false} className={styles.back}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.backIcon}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Samples
      </Link>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{sample.humanId}</h1>
          <p className={styles.subtitle}>Logged by {sample.createdBy.name}</p>
        </div>
      </header>

      <SampleDetail
        sample={{ ...(sample as any), parentSample }}
        childSamples={childSamples.map((c) => ({
          id: c.id,
          humanId: c.humanId,
          currentPhase: c.currentPhase,
        }))}
      />

      <ImageAttachment
        sampleId={sample.id}
        images={(sample as any).images || []}
      />
    </div>
  );
}
