import type { DataSet, Incident } from '../types';

const mode = (import.meta.env.VITE_DATA_SOURCE ?? 'auto') as 'api' | 'static' | 'auto';

function normaliseIncident(raw: Record<string, unknown>): Incident {
  return {
    eiId: String(raw.eiId ?? ''),
    createdAt: (raw.createdAt as string | null) ?? null,
    countReceived: Number(raw.countReceived ?? 0),
    countResolved: Number(raw.countResolved ?? 0),
    countOpen: Number(raw.countOpen ?? 0),
    miId: (raw.miId as string | null) ?? null,
    workId: (raw.workId as string | null) ?? null,
    resolutionHours: raw.resolutionHours == null ? null : Number(raw.resolutionHours),
    substatus: (raw.substatus as string | null) ?? null,
    status: (raw.status as string | null) ?? null,
    client: (raw.client as string | null) ?? null,
    region: (raw.region as string | null) ?? null,
    groupController: (raw.groupController as string | null) ?? null,
    groupExecutor: (raw.groupExecutor as string | null) ?? null,
    groupControllerMi: (raw.groupControllerMi as string | null) ?? null,
    groupExecutorMi: (raw.groupExecutorMi as string | null) ?? null,
    weekStart: (raw.weekStart as string | null) ?? null,
    yearWeek: (raw.yearWeek as string | null) ?? null,
    resolutionBucket: (raw.resolutionBucket as string | null) ?? null,
    slaEi: (raw.slaEi as string | null) ?? null,
    slaMi: (raw.slaMi as string | null) ?? null,
    solutionMi: (raw.solutionMi as string | null) ?? null,
    shortDescription: (raw.shortDescription as string | null) ?? null,
    businessDescription: (raw.businessDescription as string | null) ?? null,
    isOpen: Boolean(raw.isOpen),
    clientType: (raw.clientType as string | null) ?? null,
    siebelContract: (raw.siebelContract as string | null) ?? null,
    modifiedAt: raw.modifiedAt == null ? null : Number(raw.modifiedAt),
    problemsCount: Number(raw.problemsCount ?? 0),
  };
}

function normaliseDataSet(raw: Record<string, unknown>): DataSet {
  const incidents = Array.isArray(raw.incidents)
    ? (raw.incidents as Record<string, unknown>[]).map(normaliseIncident)
    : [];
  return {
    generatedAt: raw.generatedAt as string | undefined,
    count: typeof raw.count === 'number' ? (raw.count as number) : incidents.length,
    source: (raw.source as string | undefined) ?? undefined,
    incidents,
    meta: (raw.meta as DataSet['meta']) ?? undefined,
  };
}

async function fetchApi(): Promise<DataSet> {
  const res = await fetch('/api/incidents');
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return normaliseDataSet(await res.json());
}

async function fetchStatic(): Promise<DataSet> {
  const base = import.meta.env.BASE_URL || '/';
  const url = `${base.replace(/\/$/, '')}/data.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`static data fetch failed: ${res.status}`);
  return normaliseDataSet(await res.json());
}

export async function loadDataSet(): Promise<DataSet> {
  if (mode === 'api') return fetchApi();
  if (mode === 'static') return fetchStatic();
  try {
    return await fetchApi();
  } catch {
    return fetchStatic();
  }
}
