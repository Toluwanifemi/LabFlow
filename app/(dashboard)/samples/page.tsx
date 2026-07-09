import { auth } from '@/lib/auth/config';
import { querySamples } from '@/lib/db/samples';
import { SampleListClient } from './SampleListClient';

interface SamplesPageProps {
  searchParams: Promise<{ q?: string; sort?: string; archived?: string; page?: string; attention?: string }>;
}

export default async function SamplesPage(props: SamplesPageProps) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user) return null;

  const q = searchParams?.q?.trim() || undefined;
  const sort = (searchParams?.sort as any) || 'newest';
  const archived = searchParams?.archived === 'true';
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const attention = searchParams?.attention || undefined;
  const limit = 10;

  const { samples, total } = await querySamples(session.user.labId, {
    q,
    sort,
    archived,
    page,
    limit,
    attention,
  });

  return (
    <SampleListClient
      initialSamples={samples as any}
      initialTotal={total}
      initialPage={page}
      initialQ={q || ''}
      initialSort={sort}
      initialArchived={archived}
      role={session.user.role}
    />
  );
}
