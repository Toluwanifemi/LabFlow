import { prisma } from './client';
import { PhaseEntry } from '@/types';
import { generateChildHumanId, generateChildSlug } from '@/lib/id/generateId';

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

import { PhaseType as PrismaPhaseType } from '@prisma/client';

function mapStringToPhaseType(phase: string): PrismaPhaseType {
  const upper = phase.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const validValues = Object.values(PrismaPhaseType) as string[];
  if (validValues.includes(upper)) {
    return upper as PrismaPhaseType;
  }
  if (upper.includes('COLLECT')) return PrismaPhaseType.COLLECTION;
  if (upper.includes('INDUCT')) return PrismaPhaseType.INDUCTION;
  if (upper.includes('MONITOR')) return PrismaPhaseType.MONITORING;
  if (upper.includes('TREAT')) return PrismaPhaseType.TREATMENT;
  if (upper.includes('ANALY')) return PrismaPhaseType.ANALYSIS;
  if (upper.includes('COMPLET')) return PrismaPhaseType.COMPLETED;
  if (upper.includes('ARCHIV')) return PrismaPhaseType.ARCHIVED;
  return PrismaPhaseType.COLLECTION;
}

export async function addPhaseToSample(sampleId: string, phaseName: string, userName: string, labId: string, userId?: string) {
  const sample = await prisma.sample.findUnique({ where: { id: sampleId, labId } });
  if (!sample) throw new Error('Sample not found');

  const history = (sample.phaseHistory as any) || [];
  const newPhase: PhaseEntry = { phase: phaseName, updatedBy: userName, timestamp: new Date().toISOString() };
  history.push(newPhase);

  const updated = await prisma.sample.update({
    where: { id: sampleId, labId },
    data: {
      currentPhase: phaseName,
      phaseHistory: history,
    },
  });

  if (userId) {
    try {
      await prisma.samplePhaseHistory.create({
        data: {
          sampleId,
          phase: mapStringToPhaseType(phaseName),
          updatedById: userId,
        }
      });
    } catch (err) {
      console.error('Failed to create relational SamplePhaseHistory:', err);
    }
  }

  return updated;
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

export async function getChildSamples(sampleId: string, labId: string) {
  return prisma.sample.findMany({
    where: { parentSampleId: sampleId, labId, isDeleted: false },
    orderBy: { humanId: 'asc' },
    include: { createdBy: { select: { name: true } } },
  });
}

export async function createReplicates(
  baseHumanId: string,
  baseSlug: string,
  replicateCount: number,
  data: { sampleType: string; source: string; collectionDate: string; description?: string; experimentType?: string },
  userId: string,
  labId: string,
) {
  const suffixes = 'ABCDEFGHIJ'.split('').slice(0, replicateCount);

  return prisma.$transaction(async (tx) => {
    const created: any[] = [];
    let parentId: string | null = null;

    for (const suffix of suffixes) {
      const humanId = generateChildHumanId(baseHumanId, suffix);
      let slug = generateChildSlug(baseSlug, suffix);
      const existingSlug = await tx.sample.findUnique({ where: { slug } });
      if (existingSlug) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
      }

      const sample: any = await tx.sample.create({
        data: {
          sampleType: data.sampleType,
          source: data.source,
          collectionDate: new Date(data.collectionDate),
          description: data.description,
          experimentType: data.experimentType,
          slug,
          humanId,
          parentSampleId: parentId,
          createdById: userId,
          labId,
        },
      });

      if (!parentId) parentId = sample.id;
      created.push(sample);
    }

    return created;
  });
}

export async function batchUpdatePhase(
  sampleIds: string[],
  phaseName: string,
  userId: string,
  userName: string,
  labId: string,
) {
  const results = await prisma.$transaction(async (tx) => {
    const updated: any[] = [];
    for (const sampleId of sampleIds) {
      const sample = await tx.sample.findUnique({ where: { id: sampleId, labId } });
      if (!sample) continue;

      const history = (sample.phaseHistory as any) || [];
      const newPhase: PhaseEntry = { phase: phaseName, updatedBy: userName, timestamp: new Date().toISOString() };
      history.push(newPhase);

      const updatedSample = await tx.sample.update({
        where: { id: sampleId, labId },
        data: { currentPhase: phaseName, phaseHistory: history },
      });
      updated.push(updatedSample);

      if (userId) {
        try {
          await tx.samplePhaseHistory.create({
            data: { sampleId, phase: mapStringToPhaseType(phaseName), updatedById: userId },
          });
        } catch (err) {
          console.error(`Failed to create SamplePhaseHistory for ${sampleId}:`, err);
        }
      }
    }
    return updated;
  });

  return results;
}

export async function getDashboardStats(labId: string) {
  const totalSamples = await prisma.sample.count({
    where: { labId, isDeleted: false }
  });
  
  const experimentsPerformed = await prisma.sample.count({
    where: { 
      labId, 
      isDeleted: false,
      experimentType: { not: null }
    }
  });

  return { totalSamples, experimentsPerformed };
}
