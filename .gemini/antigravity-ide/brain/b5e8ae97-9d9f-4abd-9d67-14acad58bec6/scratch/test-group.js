const { PrismaClient } = require('c:\\Users\\HP ELITEBOOK 840 G6\\Desktop\\LabFlow\\node_modules\\@prisma/client');
const prisma = new PrismaClient();

const ACTIVE_PHASES = [
  'collection',
  'induction',
  'monitoring',
  'treatment',
  'sample_collection',
  'analysis',
];

async function getDashboardStats(labId, userId) {
  const baseWhere = userId
    ? { labId, isDeleted: false, createdById: userId }
    : { labId, isDeleted: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [
    totalSamples,
    samplesAddedToday,
    activeExperiments,
    totalPrev,
    todayPrev,
    activePrev,
  ] = await prisma.$transaction([
    prisma.sample.count({ where: baseWhere }),
    prisma.sample.count({ where: { ...baseWhere, createdAt: { gte: today } } }),
    prisma.sample.count({
      where: {
        ...baseWhere,
        experimentType: { not: null },
        currentPhase: { in: ACTIVE_PHASES },
      },
    }),
    prisma.sample.count({ where: { ...baseWhere, createdAt: { lt: today } } }),
    prisma.sample.count({ where: { ...baseWhere, createdAt: { gte: yesterday, lt: today } } }),
    prisma.sample.count({
      where: {
        ...baseWhere,
        experimentType: { not: null },
        currentPhase: { in: ACTIVE_PHASES },
        createdAt: { lt: today },
      },
    }),
  ]);

  const calcTrend = (current, previous) => {
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

async function getPhaseDistribution(labId, userId) {
  const where = userId
    ? { labId, isDeleted: false, createdById: userId }
    : { labId, isDeleted: false };

  const grouped = await prisma.sample.groupBy({
    by: ['currentPhase'],
    where,
    _count: true,
  });

  const PHASE_ORDER = ['collection', 'experiment', 'completion'];
  const counts = {};
  let total = 0;

  for (const g of grouped) {
    const phase = (g.currentPhase || 'Collection').toLowerCase();
    counts[phase] = (counts[phase] || 0) + g._count;
    total += g._count;
  }

  return PHASE_ORDER.map((phase) => ({
    phase: phase.charAt(0).toUpperCase() + phase.slice(1),
    count: counts[phase] || 0,
    percentage: total > 0 ? Math.round(((counts[phase] || 0) / total) * 100) : 0,
  }));
}

async function getRecentActivity(labId, limit = 10, userId) {
  const where = { labId };
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

async function getRecentSamples(labId, limit = 10, userId) {
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

async function getAttentionItems(labId) {
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

  const items = [];

  if (missingImageCount > 0) {
    items.push({
      type: 'missing_images',
      count: missingImageCount,
      message: `${missingImageCount} samples missing image attachments`,
      actionLabel: 'Review Samples',
      actionHref: '/samples',
    });
  }

  if (staleSampleCount > 0) {
    items.push({
      type: 'stale_samples',
      count: staleSampleCount,
      message: `${staleSampleCount} samples not updated in 14 days`,
      actionLabel: 'Review Samples',
      actionHref: '/samples',
    });
  }

  return items;
}

async function main() {
  // Let's get the first lab in the database to test with
  const firstLab = await prisma.lab.findFirst({ select: { id: true } });
  if (!firstLab) {
    console.log('No labs in the database.');
    process.exit(0);
  }
  const labId = firstLab.id;
  console.log('Testing with labId:', labId);

  const [stats, recentActivity, attentionItems, recentSamples, phaseDistribution] = await Promise.all([
    getDashboardStats(labId),
    getRecentActivity(labId, 10),
    getAttentionItems(labId),
    getRecentSamples(labId, 10),
    getPhaseDistribution(labId),
  ]);

  console.log('All dashboard queries succeeded!');
  console.log('Stats:', stats);
  console.log('Phase Distribution:', phaseDistribution);
  console.log('Recent Activity count:', recentActivity.length);
  console.log('Attention items:', attentionItems);
  console.log('Recent Samples count:', recentSamples.length);
  process.exit(0);
}

main().catch(err => {
  console.error('CRASH DETECTED:', err);
  process.exit(1);
});
