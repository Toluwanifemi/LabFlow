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
  
  const generateCuid = () => 'c' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 14);
  const parentId = generateCuid();
  const childIds = suffixes.slice(1).map(() => generateCuid());

  const baseChildSlugs = suffixes.map(suffix => generateChildSlug(baseSlug, suffix));
  // Query all existing slugs in bulk globally
  const existingSamples = await prisma.sample.findMany({
    where: { slug: { in: baseChildSlugs } },
    select: { slug: true },
  });
  const existingSlugsSet = new Set(existingSamples.map(s => s.slug));

  const sampleDataList = suffixes.map((suffix, index) => {
    const humanId = generateChildHumanId(baseHumanId, suffix);
    let slug = baseChildSlugs[index];
    if (existingSlugsSet.has(slug)) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    }
    const id = index === 0 ? parentId : childIds[index - 1];
    
    return {
      id,
      sampleType: data.sampleType,
      source: data.source,
      collectionDate: new Date(data.collectionDate),
      description: data.description,
      experimentType: data.experimentType,
      slug,
      humanId,
      parentSampleId: index === 0 ? null : parentId,
      createdById: userId,
      labId,
    };
  });

  return prisma.$transaction(
    sampleDataList.map(item => prisma.sample.create({ data: item }))
  );
}
