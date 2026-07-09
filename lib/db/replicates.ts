import { prisma } from './client';
import { generateChildHumanId, generateChildSlug } from '@/lib/id/generateId';

export async function getChildSamples(sampleId: string, labId: string, take?: number, skip?: number) {
  return prisma.sample.findMany({
    where: { parentSampleId: sampleId, labId, isDeleted: false },
    orderBy: { humanId: 'asc' },
    include: { createdBy: { select: { name: true } } },
    take,
    skip,
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
