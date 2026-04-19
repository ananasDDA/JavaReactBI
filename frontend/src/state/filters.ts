import { create } from 'zustand';
import type { Filters, TimeUnit } from '../types';

export const DEFAULT_FILTERS: Filters = {
  clientTypes: ['Мобильный'],
  clients: [],
  statuses: [],
  regions: [],
  resolutionBuckets: [],
  eiIds: [],
  miIds: [],
  slaEi: [],
  slaMi: [],
  dateFrom: null,
  dateTo: null,
  timeUnit: 'month',
};

interface FilterState extends Filters {
  setMany: (patch: Partial<Filters>) => void;
  reset: () => void;
  setTimeUnit: (unit: TimeUnit) => void;
}

export const useFilters = create<FilterState>((set) => ({
  ...DEFAULT_FILTERS,
  setMany: (patch) => set(patch),
  setTimeUnit: (timeUnit) => set({ timeUnit }),
  reset: () => set(DEFAULT_FILTERS),
}));
