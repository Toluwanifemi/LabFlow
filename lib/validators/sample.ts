import { z } from 'zod';

export const createSampleSchema = z.object({
  sampleType: z.string().min(1, 'Sample Type is required'),
  source: z.string().min(1, 'Source is required'),
  collectionDate: z.string().min(1, 'Collection Date is required'),
  description: z.string().optional(),
  experimentType: z.string().optional(),
  parentHumanId: z.string().optional(),
  childCount: z.number().int().min(1).max(10).default(1),
});

export const updatePhaseSchema = z.object({
  phase: z.string().min(1, 'Phase name is required'),
});

export const attachImageSchema = z.object({
  filename: z.string().min(1),
  url: z.string().url(),
});
