import { auth } from '@/lib/auth/config';
import { getSamplesForLab, searchSamples } from '@/lib/db/samples';
import { SampleCard } from '@/components/samples/SampleCard';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './sampleList.module.css';

interface SamplesPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SamplesPage(props: SamplesPageProps) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user) return null;

  const q = searchParams?.q?.trim();

  let samples;
  if (q) {
    samples = await searchSamples(session.user.labId, q);
  } else {
    samples = await getSamplesForLab(session.user.labId);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{q ? `Search: "${q}"` : 'All Samples'}</h1>
          <p className={styles.subtitle}>
            {samples.length} result{samples.length !== 1 ? 's' : ''}
            {q ? ' found' : ''}
          </p>
        </div>
        <div className={styles.addBtnDesktopWrapper}>
          <Link href="/samples/new" prefetch={false} tabIndex={-1}>
            <Button variant="primary">New Sample</Button>
          </Link>
        </div>
        <Link href="/samples/new" className={styles.addBtnMobile} prefetch={false} aria-label="New sample">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </header>

      {samples.length === 0 ? (
        <EmptyState
          title={q ? `No samples match "${q}"` : 'No samples logged yet'}
          actionLabel="Log your first sample"
          actionHref="/samples/new"
        />
      ) : (
        <div className={styles.grid}>
          {samples.map(sample => (
            <SampleCard key={sample.id} sample={sample as any} />
          ))}
        </div>
      )}
    </div>
  );
}
