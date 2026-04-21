import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { computeResolutionHistogram } from '../../lib/aggregate';
import type { Incident } from '../../types';

interface Props {
  filtered: Incident[];
}

export function ResolutionHistogram({ filtered }: Props) {
  const data = useMemo(() => computeResolutionHistogram(filtered), [filtered]);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        top: 0,
        data: ['ЕИ с МИ', 'ЕИ без МИ'],
      },
      grid: { left: 48, right: 32, bottom: 40, top: 56 },
      xAxis: {
        type: 'category',
        data: [...data.labels],
        name: 'срок решения',
      },
      yAxis: {
        type: 'value',
        name: 'шт.',
      },
      series: [
        {
          name: 'ЕИ без МИ',
          type: 'bar',
          stack: 'open',
          data: data.openWithoutMi,
          itemStyle: { color: '#95de64' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'ЕИ с МИ',
          type: 'bar',
          stack: 'open',
          data: data.openWithMi,
          itemStyle: { color: '#237804' },
          emphasis: { focus: 'series' },
        },
      ],
    }),
    [data],
  );

  return (
    <div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 10,
          padding: '6px 12px',
          marginBottom: 8,
          border: '1px solid #e6e6e6',
          borderRadius: 6,
          background: '#fafafa',
        }}
      >
        <span style={{ fontSize: 12, color: '#8c8c8c' }}>Открытых ЕИ</span>
        <span style={{ fontSize: 22, fontWeight: 600, color: '#1f1f1f' }}>{data.openTotal}</span>
        <span style={{ fontSize: 11, color: '#8c8c8c' }}>в т.ч. с МИ</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#237804' }}>{data.openMiTotal}</span>
      </div>
      <ReactECharts option={option} style={{ height: 300 }} notMerge lazyUpdate />
    </div>
  );
}
