import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { computeActivity } from '../../lib/aggregate';
import { useFilters } from '../../state/filters';
import type { Incident } from '../../types';

interface Props {
  filtered: Incident[];
}

export function ActivityChart({ filtered }: Props) {
  const timeUnit = useFilters((s) => s.timeUnit);
  const series = useMemo(() => computeActivity(filtered, timeUnit), [filtered, timeUnit]);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        top: 0,
        data: [
          'Поступившие: ЕИ с МИ',
          'Поступившие: ЕИ без МИ',
          'Решённые: ЕИ с МИ',
          'Решённые: ЕИ без МИ',
          'Ср. длительность решения',
        ],
      },
      grid: { left: 48, right: 56, bottom: 40, top: 56 },
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
          name: 'Поступившие: ЕИ без МИ',
          type: 'bar',
          stack: 'received',
          data: series.receivedWithoutMi,
          itemStyle: { color: '#bae0ff' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'Поступившие: ЕИ с МИ',
          type: 'bar',
          stack: 'received',
          data: series.receivedWithMi,
          itemStyle: { color: '#1677ff' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'Решённые: ЕИ без МИ',
          type: 'bar',
          stack: 'resolved',
          data: series.resolvedWithoutMi,
          itemStyle: { color: '#ffd591' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'Решённые: ЕИ с МИ',
          type: 'bar',
          stack: 'resolved',
          data: series.resolvedWithMi,
          itemStyle: { color: '#fa8c16' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'Ср. длительность решения',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: series.avgResolution.map((v) => (v == null ? null : Number(v.toFixed(2)))),
          itemStyle: { color: '#f5222d' },
          lineStyle: { color: '#f5222d', width: 2 },
        },
      ],
    }),
    [series],
  );

  return <ReactECharts option={option} style={{ height: 340 }} notMerge lazyUpdate />;
}
