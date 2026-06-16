import { prisma } from './client';

export async function createSample(data: any, userId: string, labId: string, slug: string, humanId: string) {
  return prisma.sample.create({
    data: {
      ...data,
      collectionDate: new Date(data.collectionDate),
      slug,
      humanId,
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

export async function getSamplesForLab(labId: string) {
  return prisma.sample.findMany({
    where: { labId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
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

export async function getSampleParent(sampleId: string, labId: string) {
  const sample = await prisma.sample.findUnique({
    where: { id: sampleId, labId },
    select: { parentSampleId: true },
  });
  if (!sample?.parentSampleId) return null;
  return prisma.sample.findUnique({
    where: { id: sample.parentSampleId },
    select: { id: true, humanId: true },
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

export async function searchSamples(labId: string, query: string) {
  const phaseTypeEnumMatches = VALID_PHASES.filter((val) =>
    val.toLowerCase().includes(query.toLowerCase())
  );

  const orConditions: any[] = [
    { humanId: { contains: query, mode: 'insensitive' } },
    { sampleType: { contains: query, mode: 'insensitive' } },
    { source: { contains: query, mode: 'insensitive' } },
    { experimentType: { contains: query, mode: 'insensitive' } },
    { createdBy: { name: { contains: query, mode: 'insensitive' } } },
  ];

  if (phaseTypeEnumMatches.length > 0) {
    orConditions.push({ currentPhase: { in: phaseTypeEnumMatches } });
  }

  return prisma.sample.findMany({
    where: {
      labId,
      isDeleted: false,
      OR: orConditions,
    },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}


