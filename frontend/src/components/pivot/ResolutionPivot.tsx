import { useMemo } from 'react';
import { pivotByResolution } from '../../lib/aggregate';
import type { Incident } from '../../types';
import { PivotTable } from './PivotTable';

interface Props {
  filtered: Incident[];
}

export function ResolutionPivot({ filtered }: Props) {
  const pivot = useMemo(() => pivotByResolution(filtered), [filtered]);
  return <PivotTable pivot={pivot} rowHeader="Срок решения" />;
}
