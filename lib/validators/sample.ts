import { z } from 'zod';

export const createSampleSchema = z.object({
  sampleType: z.string().min(1, 'Sample Type is required').trim(),
  source: z.string().min(1, 'Source is required').trim(),
  collectionDate: z.string().min(1, 'Collection Date is required').trim(),
  description: z.string().trim().optional(),
  experimentType: z.string().trim().optional(),
  parentHumanId: z.string().trim().optional(),
  childCount: z.number().int().min(1).max(10).default(1),
});

export const PREDEFINED_PHASES = ['Collection', 'Experiment', 'Completion'] as const;
export type PredefinedPhase = (typeof PREDEFINED_PHASES)[number];

export const updatePhaseSchema = z.object({
  phase: z.enum(PREDEFINED_PHASES),
  experimentName: z.string().trim().optional(),
});

export const attachImageSchema = z.object({
  filename: z.string().min(1),
  url: z.string().url(),
});
