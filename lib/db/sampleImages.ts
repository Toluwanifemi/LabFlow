import { prisma } from './client';

export async function attachImage(sampleId: string, labId: string, imageData: { filename: string; uploaderId: string; uploadTimestamp: string; url: string }) {
  const sample = await prisma.sample.findUnique({
    where: { id: sampleId, labId, isDeleted: false },
  });
  if (!sample) return null;

  const images = (sample.images as any[]) || [];
  images.push(imageData);

  const updated = await prisma.sample.update({
    where: { id: sampleId, labId },
    data: { images },
  });

  return updated;
}
