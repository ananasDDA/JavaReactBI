import { useMemo } from 'react';
import { Col, Row, Statistic } from 'antd';
import { computeKpi } from '../../lib/aggregate';
import type { Incident } from '../../types';

interface Props {
  filtered: Incident[];
}

export function KpiCard({ filtered }: Props) {
  const kpi = useMemo(() => computeKpi(filtered), [filtered]);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>ЕИ</div>
      <div className="kpi-value">{kpi.totalEi}</div>
      <div className="kpi-sub">уникальных единичных инцидентов</div>
      <Row gutter={12} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Statistic title="Открытых" value={kpi.open} valueStyle={{ fontSize: 16 }} />
        </Col>
        <Col span={12}>
          <Statistic title="Решённых" value={kpi.resolved} valueStyle={{ fontSize: 16 }} />
        </Col>
      </Row>
      <Row gutter={12} style={{ marginTop: 8 }}>
        <Col span={12}>
          <Statistic title="Поступивших" value={kpi.received} valueStyle={{ fontSize: 16 }} />
        </Col>
        <Col span={12}>
          <Statistic
            title="Ср. длит., ч"
            value={kpi.avgResolutionHours == null ? '—' : kpi.avgResolutionHours.toFixed(1)}
            valueStyle={{ fontSize: 16 }}
          />
        </Col>
      </Row>
    </div>
  );
}
