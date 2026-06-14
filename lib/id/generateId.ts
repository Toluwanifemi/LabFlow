export function generateHumanId(
  sampleType: string,
  sequence: number
): string {
  const prefix = sampleType.slice(0, 3).toUpperCase();
  const paddedSequence = String(sequence).padStart(3, '0');
  return `${prefix}${paddedSequence}`;
}

export function generateSlug(sampleType: string, humanId: string): string {
  const sanitised = sampleType
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return `${sanitised}-${humanId.toLowerCase()}`;
}

export function generateSlugWithFallback(sampleType: string, humanId: string): string {
  const base = generateSlug(sampleType, humanId);
  const suffix = Math.random().toString(36).slice(2, 5);
  return `${base}-${suffix}`;
}

export function generateChildHumanId(parentHumanId: string, suffix: string): string {
  return `${parentHumanId}-${suffix.toUpperCase()}`;
}

export function generateChildSlug(parentSlug: string, suffix: string): string {
  return `${parentSlug}-${suffix.toLowerCase()}`;
}
