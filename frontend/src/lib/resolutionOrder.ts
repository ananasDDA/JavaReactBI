export const RESOLUTION_ORDER: readonly string[] = [
  '<4',
  '4-12',
  '12-24',
  '24-72',
  '>72',
  'Не определено',
];

export function resolutionIndex(bucket: string | null | undefined): number {
  if (bucket == null) return RESOLUTION_ORDER.length;
  const idx = RESOLUTION_ORDER.indexOf(bucket);
  return idx === -1 ? RESOLUTION_ORDER.length : idx;
}

export function compareResolution(a: string | null, b: string | null): number {
  return resolutionIndex(a) - resolutionIndex(b);
}
