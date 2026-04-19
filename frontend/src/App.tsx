import { useEffect, useMemo, useState } from 'react';
import { Alert, Spin } from 'antd';
import { loadDataSet } from './api/client';
import type { DataSet } from './types';
import { useFilters } from './state/filters';
import { applyFilters } from './lib/aggregate';
import { DashboardPage } from './components/layout/DashboardPage';
import { FiltersSidebar } from './components/filters/FiltersSidebar';

export default function App() {
  const [dataset, setDataset] = useState<DataSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filters = useFilters();

  useEffect(() => {
    loadDataSet().then(setDataset).catch((e: Error) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!dataset) return [];
    return applyFilters(dataset.incidents, filters);
  }, [dataset, filters]);

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <Alert type="error" showIcon message="Не удалось загрузить данные" description={error} />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Spin size="large" tip="Загрузка данных..." />
      </div>
    );
  }

  return (
    <div className="layout-row">
      <div className="layout-main">
        <DashboardPage dataset={dataset} filtered={filtered} />
      </div>
      <aside className="sidebar">
        <FiltersSidebar dataset={dataset} />
      </aside>
    </div>
  );
}
