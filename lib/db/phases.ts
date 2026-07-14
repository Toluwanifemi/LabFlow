import { prisma } from './client';
import { parsePhaseHistory } from '@/types';
import type { PhaseEntry } from '@/types';
import { Prisma } from '@prisma/client';

export async function getSamplePhase(sampleId: string, labId: string) {
  return prisma.sample.findUnique({
    where: { id: sampleId, labId },
    select: { currentPhase: true },
  });
}

export async function addPhaseToSample(
  sampleId: string,
  phaseName: string,
  userName: string,
  labId: string,
  options?: { experimentName?: string; userId?: string },
) {
  const sample = await prisma.sample.findUnique({ where: { id: sampleId, labId } });
  if (!sample) throw new Error('Sample not found');

  const history = parsePhaseHistory(sample.phaseHistory);
  const newPhase: PhaseEntry = {
    phase: phaseName,
    updatedBy: userName,
    timestamp: new Date().toISOString(),
    ...(options?.experimentName ? { experimentName: options.experimentName } : {}),
  };
  history.push(newPhase);

  const updateData: Prisma.SampleUpdateInput = {
    currentPhase: phaseName,
    phaseHistory: history as unknown as Prisma.InputJsonValue,
  };

  if (phaseName === 'Experiment' && options?.experimentName) {
    updateData.experimentType = options.experimentName;
  }

  const updated = await prisma.sample.update({
    where: { id: sampleId, labId },
    data: updateData,
  });

  return updated;
}

export async function batchUpdatePhase(
  sampleIds: string[],
  phaseName: string,
  userName: string,
  labId: string,
  options?: { experimentName?: string },
) {
  // 1 query: fetch current phaseHistory for all samples
  const samples = await prisma.sample.findMany({
    where: { id: { in: sampleIds }, labId },
    select: { id: true, phaseHistory: true },
  });

  const newPhaseEntry: PhaseEntry = {
    phase: phaseName,
    updatedBy: userName,
    timestamp: new Date().toISOString(),
    ...(options?.experimentName ? { experimentName: options.experimentName } : {}),
  };

  const updateData: Record<string, unknown> = {
    currentPhase: phaseName,
  };

  if (phaseName === 'Experiment' && options?.experimentName) {
    updateData.experimentType = options.experimentName;
  }

  // Build all update operations for a single transaction
  const updates = samples.map((sample) => {
    const history = parsePhaseHistory(sample.phaseHistory);
    history.push(newPhaseEntry);
    return prisma.sample.update({
      where: { id: sample.id, labId },
      data: { ...updateData, phaseHistory: history as unknown as Prisma.InputJsonValue },
    });
  });

  // 1 transaction: batch all updates (still 1 query per sample, but no N+1 blocking)
  const results = await prisma.$transaction(updates);

  return results;
}
