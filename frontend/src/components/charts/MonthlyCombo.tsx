import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { computeMonthly } from '../../lib/aggregate';
import { useFilters } from '../../state/filters';
import type { Incident } from '../../types';

interface Props {
  filtered: Incident[];
}

export function MonthlyCombo({ filtered }: Props) {
  const timeUnit = useFilters((s) => s.timeUnit);
  const series = useMemo(() => computeMonthly(filtered, timeUnit), [filtered, timeUnit]);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        top: 0,
        data: [
          'Кол-во открытых ЕИ',
          'Кол-во решённых ЕИ',
          'Кол-во поступивших ЕИ',
          'Ср. длительность решения',
          'Кол-во ЕИ с МИ',
          'Кол-во ЕИ с SLA',
        ],
      },
      grid: { left: 40, right: 50, bottom: 30, top: 40 },
      xAxis: [
        {
          type: 'category',
          data: series.labels,
          axisPointer: { type: 'shadow' },
        },
      ],
      yAxis: [
        { type: 'value', name: 'шт.', position: 'left' },
        { type: 'value', name: 'ч.', position: 'right' },
      ],
      series: [
        {
          name: 'Кол-во открытых ЕИ',
          type: 'bar',
          stack: 'bars',
          data: series.open,
          itemStyle: { color: '#1677ff' },
        },
        {
          name: 'Кол-во решённых ЕИ',
          type: 'bar',
          stack: 'bars',
          data: series.resolved,
          itemStyle: { color: '#fa8c16' },
        },
        {
          name: 'Кол-во поступивших ЕИ',
          type: 'bar',
          stack: 'bars',
          data: series.received,
          itemStyle: { color: '#52c41a' },
        },
        {
          name: 'Ср. длительность решения',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: series.avgResolution.map((v) => (v == null ? null : Number(v.toFixed(2)))),
          itemStyle: { color: '#f5222d' },
          lineStyle: { color: '#f5222d', width: 2 },
        },
        {
          name: 'Кол-во ЕИ с МИ',
          type: 'line',
          data: series.withMi,
          itemStyle: { color: '#722ed1' },
          lineStyle: { color: '#722ed1', type: 'dashed' },
        },
        {
          name: 'Кол-во ЕИ с SLA',
          type: 'line',
          data: series.withSla,
          itemStyle: { color: '#13c2c2' },
          lineStyle: { color: '#13c2c2', type: 'dashed' },
        },
      ],
    }),
    [series],
  );

  return <ReactECharts option={option} style={{ height: 320 }} notMerge lazyUpdate />;
}
