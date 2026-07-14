import Link from 'next/link';
import { auth } from '@/lib/auth/config';
import { getSampleById, getSampleBySlug, updateSampleQR } from '@/lib/db/samples';
import { prisma } from '@/lib/db/client';
import { getChildSamples } from '@/lib/db/replicates';
import { notFound } from 'next/navigation';
import { parsePhaseHistory, parseImages } from '@/types';
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

  const [childSamples, parentSample] = await Promise.all([
    getChildSamples(sample.id, session.user.labId, 50),
    sample.parentSampleId
      ? prisma.sample.findUnique({
          where: { id: sample.parentSampleId },
          select: { id: true, humanId: true },
        })
      : Promise.resolve(null),
  ]);

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

  const serializedSample = {
    id: sample.id,
    humanId: sample.humanId,
    slug: sample.slug,
    sampleType: sample.sampleType,
    source: sample.source,
    collectionDate: sample.collectionDate.toISOString(),
    description: sample.description,
    experimentType: sample.experimentType,
    currentPhase: sample.currentPhase,
    phaseHistory: parsePhaseHistory(sample.phaseHistory),
    qrCodeUrl: sample.qrCodeUrl,
    createdBy: {
      name: sample.createdBy.name,
    },
    parentSample: parentSample ? {
      id: parentSample.id,
      humanId: parentSample.humanId,
    } : null,
  };

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
        sample={serializedSample}
        childSamples={childSamples.map((c) => ({
          id: c.id,
          humanId: c.humanId,
          currentPhase: c.currentPhase,
        }))}
      />

      <ImageAttachment
        sampleId={sample.id}
        images={parseImages(sample.images)}
      />
    </div>
  );
}
