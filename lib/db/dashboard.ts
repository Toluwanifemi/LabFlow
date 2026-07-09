import { prisma } from './client';

export interface DashboardStats {
  totalSamples: number;
  totalSamplesTrend: number;
  samplesAddedToday: number;
  samplesAddedTodayTrend: number;
  activeExperiments: number;
  activeExperimentsTrend: number;
}

export interface PhaseDistributionItem {
  phase: string;
  count: number;
  percentage: number;
}

export interface RecentActivityItem {
  id: string;
  userName: string;
  actionType: string;
  sampleHumanId: string | null;
  timestamp: string;
}

export interface AttentionItem {
  type: 'missing_images' | 'stale_samples' | 'sync_issues';
  count: number;
  message: string;
  actionLabel: string;
  actionHref: string;
}

export interface RecentSampleItem {
  id: string;
  humanId: string;
  slug: string;
  sampleType: string;
  source: string;
  currentPhase: string | null;
  updatedAt: string;
  isDeleted: boolean;
  createdByName: string | null;
}

const ACTIVE_PHASES = [
  'collection',
  'induction',
  'monitoring',
  'treatment',
  'sample_collection',
  'analysis',
];

export async function getDashboardStats(labId: string, userId?: string): Promise<DashboardStats> {
  const baseWhere = userId
    ? { labId, isDeleted: false, createdById: userId }
    : { labId, isDeleted: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Fetch all stats for current and previous periods concurrently
  const [
    totalSamples,
    samplesAddedToday,
    activeExperiments,
    totalPrev,
    todayPrev,
    activePrev,
  ] = await Promise.all([
    // Current period stats
    prisma.sample.count({ where: baseWhere }),
    prisma.sample.count({
      where: { ...baseWhere, createdAt: { gte: today } },
    }),
    prisma.sample.count({
      where: {
        ...baseWhere,
        experimentType: { not: null },
        currentPhase: { in: ACTIVE_PHASES },
      },
    }),
    // Previous period stats (Trend reference points)
    prisma.sample.count({
      where: { ...baseWhere, createdAt: { lt: today } },
    }),
    prisma.sample.count({
      where: {
        ...baseWhere,
        createdAt: { gte: yesterday, lt: today },
      },
    }),
    prisma.sample.count({
      where: {
        ...baseWhere,
        experimentType: { not: null },
        currentPhase: { in: ACTIVE_PHASES },
        createdAt: { lt: today },
      },
    }),
  ]);

  const calcTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    totalSamples,
    totalSamplesTrend: calcTrend(totalSamples, totalPrev),
    samplesAddedToday,
    samplesAddedTodayTrend: calcTrend(samplesAddedToday, todayPrev),
    activeExperiments,
    activeExperimentsTrend: calcTrend(activeExperiments, activePrev),
  };
}

export async function getPhaseDistribution(labId: string, userId?: string): Promise<PhaseDistributionItem[]> {
  const where = userId
    ? { labId, isDeleted: false, createdById: userId }
    : { labId, isDeleted: false };

  const samples = await prisma.sample.findMany({
    where,
    select: { currentPhase: true },
  });

  const PHASE_ORDER = ['collection', 'experiment', 'completion'];
  const counts: Record<string, number> = {};
  let total = 0;

  for (const s of samples) {
    const phase = (s.currentPhase || 'Collection').toLowerCase();
    counts[phase] = (counts[phase] || 0) + 1;
    total++;
  }

  return PHASE_ORDER.map((phase) => ({
    phase: phase.charAt(0).toUpperCase() + phase.slice(1),
    count: counts[phase] || 0,
    percentage: total > 0 ? Math.round(((counts[phase] || 0) / total) * 100) : 0,
  }));
}

export async function getRecentActivity(labId: string, limit = 10, userId?: string): Promise<RecentActivityItem[]> {
  const where: any = { user: { labId } };
  if (userId) {
    where.userId = userId;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { name: true } },
      sample: { select: { humanId: true } },
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    userName: log.user.name,
    actionType: log.actionType,
    sampleHumanId: log.sample?.humanId ?? null,
    timestamp: log.timestamp.toISOString(),
  }));
}

export async function getAttentionItems(labId: string): Promise<AttentionItem[]> {
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - 14);

  const [missingImageCount, staleSampleCount] = await Promise.all([
    prisma.sample.count({
      where: { labId, isDeleted: false, images: { equals: [] } },
    }),
    prisma.sample.count({
      where: { labId, isDeleted: false, updatedAt: { lt: staleThreshold } },
    }),
  ]);

  const items: AttentionItem[] = [];

  if (missingImageCount > 0) {
    items.push({
      type: 'missing_images',
      count: missingImageCount,
      message: `${missingImageCount} sample${missingImageCount !== 1 ? 's' : ''} missing image attachments`,
      actionLabel: 'Review Samples',
      actionHref: '/samples',
    });
  }

  if (staleSampleCount > 0) {
    items.push({
      type: 'stale_samples',
      count: staleSampleCount,
      message: `${staleSampleCount} sample${staleSampleCount !== 1 ? 's' : ''} not updated in 14 days`,
      actionLabel: 'Review Samples',
      actionHref: '/samples',
    });
  }

  return items;
}

export async function getRecentSamples(labId: string, limit = 10, userId?: string): Promise<RecentSampleItem[]> {
  const where = userId
    ? { labId, isDeleted: false, createdById: userId }
    : { labId, isDeleted: false };

  const samples = await prisma.sample.findMany({
    where,
    include: {
      createdBy: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  return samples.map((s) => ({
    id: s.id,
    humanId: s.humanId,
    slug: s.slug,
    sampleType: s.sampleType,
    source: s.source,
    currentPhase: s.currentPhase,
    updatedAt: s.updatedAt.toISOString(),
    isDeleted: s.isDeleted,
    createdByName: s.createdBy.name,
  }));
}
