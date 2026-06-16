import { prisma } from './client';
import { Lab } from '@/types';

export async function getLabById(labId: string): Promise<Lab | null> {
  return prisma.lab.findUnique({ where: { id: labId } }) as unknown as Promise<Lab | null>;
}

export async function createLab(name: string, institution?: string) {
  return prisma.lab.create({
    data: { name, institution },
  });
}

export async function updateLabSettings(labId: string, data: { name?: string; institution?: string; researchFields?: string[] }): Promise<Lab> {
  return prisma.lab.update({
    where: { id: labId },
    data,
  }) as unknown as Promise<Lab>;
}
