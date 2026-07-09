import { prisma } from './client';
import { PhaseEntry } from '@/types';


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

  const history = (sample.phaseHistory as any) || [];
  const newPhase: PhaseEntry = {
    phase: phaseName,
    updatedBy: userName,
    timestamp: new Date().toISOString(),
    ...(options?.experimentName ? { experimentName: options.experimentName } : {}),
  };
  history.push(newPhase);

  const updateData: Record<string, unknown> = {
    currentPhase: phaseName,
    phaseHistory: history,
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
  userId: string,
  userName: string,
  labId: string,
  options?: { experimentName?: string },
) {
  const results = await prisma.$transaction(async (tx) => {
    const updated: any[] = [];
    for (const sampleId of sampleIds) {
      const sample = await tx.sample.findUnique({ where: { id: sampleId, labId } });
      if (!sample) continue;

      const history = (sample.phaseHistory as any) || [];
      const newPhase: PhaseEntry = {
        phase: phaseName,
        updatedBy: userName,
        timestamp: new Date().toISOString(),
        ...(options?.experimentName ? { experimentName: options.experimentName } : {}),
      };
      history.push(newPhase);

      const updateData: Record<string, unknown> = {
        currentPhase: phaseName,
        phaseHistory: history,
      };

      if (phaseName === 'Experiment' && options?.experimentName) {
        updateData.experimentType = options.experimentName;
      }

      const updatedSample = await tx.sample.update({
        where: { id: sampleId, labId },
        data: updateData,
      });
      updated.push(updatedSample);
    }
    return updated;
  });

  return results;
}
