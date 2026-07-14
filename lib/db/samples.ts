import { prisma } from './client';

export async function createSample(data: any, userId: string, labId: string, slug: string, humanId: string) {
  return prisma.sample.create({
    data: {
      ...data,
      collectionDate: new Date(data.collectionDate),
      slug,
      humanId,
      currentPhase: 'Collection',
      createdById: userId,
      labId,
    },
  });
}

export async function updateSampleQR(sampleId: string, qrCodeUrl: string, labId: string) {
  return prisma.sample.update({
    where: { id: sampleId, labId },
    data: { qrCodeUrl },
  });
}

export async function getSampleById(sampleId: string, labId: string) {
  return prisma.sample.findUnique({
    where: { id: sampleId, labId, isDeleted: false },
    include: { createdBy: { select: { name: true } } }
  });
}

export async function getSampleBySlug(slug: string, labId: string) {
  return prisma.sample.findUnique({
    where: { slug, labId, isDeleted: false },
    include: { createdBy: { select: { name: true } } }
  });
}

export async function getSampleByHumanId(humanId: string, labId: string) {
  return prisma.sample.findUnique({
    where: { humanId_labId: { humanId, labId }, isDeleted: false },
  });
}

export async function getSamplesForLab(labId: string, page = 1, limit = 25) {
  const skip = (page - 1) * limit;
  return prisma.sample.findMany({
    where: { labId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });
}

export async function getSamplesCountForLab(labId: string): Promise<number> {
  return prisma.sample.count({
    where: { labId, isDeleted: false },
  });
}

export async function softDeleteSample(sampleId: string, userId: string, labId: string) {
  return prisma.sample.update({
    where: { id: sampleId, labId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedById: userId,
    }
  });
}

export async function restoreSample(sampleId: string, labId: string) {
  return prisma.sample.update({
    where: { id: sampleId, labId },
    data: { isDeleted: false, deletedAt: null, deletedById: null }
  });
}

export async function updateSample(sampleId: string, labId: string, data: Record<string, unknown>) {
  return prisma.sample.update({
    where: { id: sampleId, labId },
    data,
  });
}

export async function getNextSampleSequence(labId: string, sampleType: string): Promise<number> {
  const prefix = sampleType.slice(0, 3).toUpperCase();
  const count = await prisma.sample.count({
    where: {
      labId,
      humanId: { startsWith: prefix },
    },
  });
  return count + 1;
}

export async function getSamplesByIds(ids: string[], labId: string) {
  return prisma.sample.findMany({
    where: { id: { in: ids }, labId },
    select: { id: true, currentPhase: true },
  });
}

export async function getSamplesWithoutQR(labId: string) {
  return prisma.sample.findMany({
    where: { labId, qrCodeUrl: null, isDeleted: false },
    select: { id: true },
  });
}

const VALID_PHASES = [
  'COLLECTION',
  'INDUCTION',
  'MONITORING',
  'TREATMENT',
  'SAMPLE_COLLECTION',
  'ANALYSIS',
  'COMPLETED',
  'ARCHIVED'
];

export async function querySamples(
  labId: string,
  options: {
    q?: string;
    sampleType?: string;
    sort?: string;
    archived?: boolean;
    page?: number;
    limit?: number;
    attention?: string;
  } = {}
) {
  const { q, sampleType, sort = 'newest', archived = false, page = 1, limit = 25, attention } = options;
  const skip = (page - 1) * limit;

  const where: any = { labId };

  where.isDeleted = archived;

  if (q) {
    const phaseTypeEnumMatches = VALID_PHASES.filter((val) =>
      val.toLowerCase().includes(q.toLowerCase())
    );
    const orConditions: any[] = [
      { humanId: { contains: q, mode: 'insensitive' } },
      { sampleType: { contains: q, mode: 'insensitive' } },
      { source: { contains: q, mode: 'insensitive' } },
      { experimentType: { contains: q, mode: 'insensitive' } },
      { createdBy: { name: { contains: q, mode: 'insensitive' } } },
    ];
    if (phaseTypeEnumMatches.length > 0) {
      orConditions.push({ currentPhase: { in: phaseTypeEnumMatches } });
    }
    where.OR = orConditions;
  }

  if (sampleType) {
    where.sampleType = { equals: sampleType, mode: 'insensitive' };
  }

  if (attention) {
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - 14);

    const attentionConditions: any[] = [];
    if (attention === 'missing_images' || attention === 'all') {
      attentionConditions.push({ images: { equals: [] } });
    }
    if (attention === 'stale' || attention === 'all') {
      attentionConditions.push({ updatedAt: { lt: staleThreshold } });
    }

    if (attentionConditions.length > 0) {
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: attentionConditions }];
        delete where.OR;
      } else {
        where.OR = attentionConditions;
      }
    }
  }

  let orderBy: any;
  switch (sort) {
    case 'oldest': orderBy = { createdAt: 'asc' }; break;
    case 'type_asc': orderBy = { sampleType: 'asc' }; break;
    case 'type_desc': orderBy = { sampleType: 'desc' }; break;
    case 'id_asc': orderBy = { humanId: 'asc' }; break;
    case 'id_desc': orderBy = { humanId: 'desc' }; break;
    case 'source_asc': orderBy = { source: 'asc' }; break;
    case 'source_desc': orderBy = { source: 'desc' }; break;
    case 'date_asc': orderBy = { collectionDate: 'asc' }; break;
    case 'date_desc': orderBy = { collectionDate: 'desc' }; break;
    case 'phase_asc': orderBy = { currentPhase: 'asc' }; break;
    case 'phase_desc': orderBy = { currentPhase: 'desc' }; break;
    default: orderBy = { createdAt: 'desc' };
  }

  const [samples, total] = await Promise.all([
    prisma.sample.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.sample.count({ where }),
  ]);

  return { samples, total };
}

export async function checkSlugExistsGlobally(slug: string): Promise<boolean> {
  const existing = await prisma.sample.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !!existing;
}


