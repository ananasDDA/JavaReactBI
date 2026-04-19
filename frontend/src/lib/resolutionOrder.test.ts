import { describe, expect, it } from 'vitest';
import { compareResolution, RESOLUTION_ORDER, resolutionIndex } from './resolutionOrder';

describe('resolutionOrder', () => {
  it('fixed order matches product spec', () => {
    expect(RESOLUTION_ORDER).toEqual(['<4', '4-12', '12-24', '24-72', '>72', 'Не определено']);
  });
  it('sorts buckets by order', () => {
    const input = ['>72', '<4', '4-12', '24-72', '12-24', 'Не определено'];
    const sorted = [...input].sort(compareResolution);
    expect(sorted).toEqual(['<4', '4-12', '12-24', '24-72', '>72', 'Не определено']);
  });
  it('unknown buckets sort at the end', () => {
    expect(resolutionIndex('42h')).toBe(RESOLUTION_ORDER.length);
    expect(resolutionIndex(null)).toBe(RESOLUTION_ORDER.length);
  });
});
