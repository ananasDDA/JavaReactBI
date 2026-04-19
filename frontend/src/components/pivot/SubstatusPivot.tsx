import { useMemo } from 'react';
import { pivotBySubstatus } from '../../lib/aggregate';
import type { Incident } from '../../types';
import { PivotTable } from './PivotTable';

interface Props {
  filtered: Incident[];
}

export function SubstatusPivot({ filtered }: Props) {
  const pivot = useMemo(() => pivotBySubstatus(filtered), [filtered]);
  return <PivotTable pivot={pivot} rowHeader="Подстатус" />;
}
