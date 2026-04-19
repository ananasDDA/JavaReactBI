import { Space, Tag, Typography } from 'antd';
import type { DataSet, Incident } from '../../types';
import { KpiCard } from '../kpi/KpiCard';
import { MonthlyCombo } from '../charts/MonthlyCombo';
import { SubstatusPivot } from '../pivot/SubstatusPivot';
import { ResolutionPivot } from '../pivot/ResolutionPivot';
import { OpenIncidentsTable } from '../tables/OpenIncidentsTable';
import { AllIncidentsTable } from '../tables/AllIncidentsTable';

interface Props {
  dataset: DataSet;
  filtered: Incident[];
}

export function DashboardPage({ dataset, filtered }: Props) {
  return (
    <div>
      <div className="layout-header">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Обращаемость клиентов pLTE
        </Typography.Title>
        <Space>
          <Tag color="blue">Записей: {filtered.length}</Tag>
          {dataset.generatedAt ? (
            <Tag color="default">Снимок: {dataset.generatedAt}</Tag>
          ) : null}
          {dataset.source ? <Tag color="geekblue">{dataset.source}</Tag> : null}
        </Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        <KpiCard filtered={filtered} />
        <div className="panel">
          <h3 className="panel-title">Зарегистрированные, решённые ЕИ</h3>
          <MonthlyCombo filtered={filtered} />
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">Количество поступивших ЕИ по подстатусам, шт., %</h3>
        <SubstatusPivot filtered={filtered} />
      </div>

      <div className="panel">
        <h3 className="panel-title">Количество ЕИ в зависимости от срока решения, шт., %</h3>
        <ResolutionPivot filtered={filtered} />
      </div>

      <div className="panel">
        <h3 className="panel-title">Детализация по открытым ЕИ</h3>
        <OpenIncidentsTable filtered={filtered} meta={dataset.meta} />
      </div>

      <div className="panel">
        <h3 className="panel-title">Общая детализация</h3>
        <AllIncidentsTable filtered={filtered} meta={dataset.meta} />
      </div>
    </div>
  );
}
