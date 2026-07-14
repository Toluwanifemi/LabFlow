import { prisma } from './client';
import { parseImages } from '@/types';
import type { Prisma } from '@prisma/client';

export async function attachImage(sampleId: string, labId: string, imageData: { filename: string; uploaderId: string; uploadTimestamp: string; url: string }) {
  return prisma.$transaction(async (tx) => {
    const sample = await tx.sample.findUnique({
      where: { id: sampleId, labId, isDeleted: false },
      select: { images: true },
    });
    if (!sample) return null;

    const images = parseImages(sample.images);
    images.push(imageData);

    return tx.sample.update({
      where: { id: sampleId, labId },
      data: { images: images as unknown as Prisma.InputJsonValue },
    });
  });
}
