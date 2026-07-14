import { prisma } from './client';
import type { Lab } from '@/types';
import { toLab } from './mappers';

export async function createLab(name: string, institution?: string) {
  return prisma.lab.create({
    data: { name, institution },
  });
}

export async function updateLabSettings(labId: string, data: { name?: string; institution?: string; researchFields?: string[] }): Promise<Lab> {
  const lab = await prisma.lab.update({
    where: { id: labId },
    data,
  });
  return toLab(lab);
}
