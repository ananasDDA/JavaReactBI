export interface Incident {
  eiId: string;
  createdAt: string | null;
  countReceived: number;
  countResolved: number;
  countOpen: number;
  miId: string | null;
  workId: string | null;
  resolutionHours: number | null;
  substatus: string | null;
  status: string | null;
  client: string | null;
  region: string | null;
  groupController: string | null;
  groupExecutor: string | null;
  groupControllerMi: string | null;
  groupExecutorMi: string | null;
  weekStart: string | null;
  yearWeek: string | null;
  resolutionBucket: string | null;
  slaEi: string | null;
  slaMi: string | null;
  solutionMi: string | null;
  shortDescription: string | null;
  businessDescription: string | null;
  isOpen: boolean;
  clientType: string | null;
  siebelContract: string | null;
  modifiedAt: number | null;
  problemsCount: number;
}

export interface DataSetMeta {
  remedyEiUrl?: string;
  remedyMiUrl?: string;
  resolutionOrder?: string[];
  statuses?: string[];
  substatuses?: string[];
  clients?: string[];
  regions?: string[];
  clientTypes?: string[];
  controllerGroups?: string[];
  executorGroups?: string[];
  yearWeeks?: Record<string, number>;
}

export interface DataSet {
  generatedAt?: string;
  count?: number;
  source?: string;
  incidents: Incident[];
  meta?: DataSetMeta;
}

export interface Filters {
  clientTypes: string[];
  clients: string[];
  statuses: string[];
  regions: string[];
  resolutionBuckets: string[];
  eiIds: string[];
  miIds: string[];
  slaEi: string[];
  slaMi: string[];
  dateFrom: string | null;
  dateTo: string | null;
  timeUnit: TimeUnit;
}

export type TimeUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';
