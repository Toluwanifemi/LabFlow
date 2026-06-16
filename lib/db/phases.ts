import { prisma } from './client';
import { PhaseEntry } from '@/types';


export async function getSamplePhase(sampleId: string, labId: string) {
  return prisma.sample.findUnique({
    where: { id: sampleId, labId },
    select: { currentPhase: true },
  });
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


  return updated;
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

    }
    return updated;
  });

  return results;
}
