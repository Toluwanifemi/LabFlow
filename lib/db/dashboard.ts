import { prisma } from './client';

export interface DashboardStats {
  totalSamples: number;
  totalSamplesTrend: number;
  samplesAddedToday: number;
  samplesAddedTodayTrend: number;
  activeExperiments: number;
  activeExperimentsTrend: number;
  pendingUpdates: number;
  pendingUpdatesTrend: number;
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
  timestamp: Date;
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
  updatedAt: Date;
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

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - 14);

  const [totalSamples, samplesAddedToday, activeExperiments, pendingUpdates,
         totalPrev, todayPrev, activePrev, pendingPrev] = await Promise.all([
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
    prisma.sample.count({
      where: { ...baseWhere, updatedAt: { lt: staleThreshold } },
    }),
    // Previous period: total samples 7 days ago
    prisma.sample.count({
      where: { ...baseWhere, createdAt: { lt: today } },
    }),
    // Yesterday's added samples
    prisma.sample.count({
      where: {
        ...baseWhere,
        createdAt: { gte: yesterday, lt: today },
      },
    }),
    // Active experiments 7 days ago
    prisma.sample.count({
      where: {
        ...baseWhere,
        experimentType: { not: null },
        currentPhase: { in: ACTIVE_PHASES },
        createdAt: { lt: today },
      },
    }),
    // Pending updates 7 days ago (stale samples created before 14 days ago)
    prisma.sample.count({
      where: {
        ...baseWhere,
        updatedAt: { lt: staleThreshold },
        createdAt: { lt: sevenDaysAgo },
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
    pendingUpdates,
    pendingUpdatesTrend: calcTrend(pendingUpdates, pendingPrev),
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

  const PHASE_ORDER = [
    'collection',
    'induction',
    'monitoring',
    'treatment',
    'sample_collection',
    'analysis',
    'completed',
    'archived'
  ];
  const counts: Record<string, number> = {};
  let total = 0;

  for (const s of samples) {
    const phase = s.currentPhase || 'collection';
    counts[phase] = (counts[phase] || 0) + 1;
    total++;
  }

  return PHASE_ORDER.map((phase) => ({
    phase,
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
    timestamp: log.timestamp,
  }));
}

export async function getAttentionItems(labId: string): Promise<AttentionItem[]> {
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - 14);

  const [missingImageCount, staleSampleCount] = await Promise.all([
    prisma.sample.count({
      where: {
        labId,
        isDeleted: false,
        images: { equals: [] },
      },
    }),
    prisma.sample.count({
      where: {
        labId,
        isDeleted: false,
        updatedAt: { lt: staleThreshold },
      },
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
    updatedAt: s.updatedAt,
    isDeleted: s.isDeleted,
    createdByName: s.createdBy.name,
  }));
}
