import { useMemo } from 'react';
import { Button, DatePicker, Divider, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import type { DataSet } from '../../types';
import { useFilters } from '../../state/filters';
import { RESOLUTION_ORDER } from '../../lib/resolutionOrder';

const { RangePicker } = DatePicker;

function options(arr: string[] | undefined) {
  return (arr ?? []).map((v) => ({ label: v, value: v }));
}

function distinct(list: (string | null | undefined)[]): string[] {
  const s = new Set<string>();
  for (const v of list) if (v) s.add(v);
  return Array.from(s).sort((a, b) => a.localeCompare(b, 'ru'));
}

interface Props {
  dataset: DataSet;
}

export function FiltersSidebar({ dataset }: Props) {
  const f = useFilters();

  const choices = useMemo(() => {
    const i = dataset.incidents;
    return {
      clientTypes: dataset.meta?.clientTypes ?? distinct(i.map((x) => x.clientType)),
      clients: dataset.meta?.clients ?? distinct(i.map((x) => x.client)),
      statuses: dataset.meta?.statuses ?? distinct(i.map((x) => x.status)),
      regions: dataset.meta?.regions ?? distinct(i.map((x) => x.region)),
      eiIds: distinct(i.map((x) => x.eiId)),
      miIds: distinct(i.map((x) => x.miId)),
      slaEi: distinct(i.map((x) => x.slaEi)),
      slaMi: distinct(i.map((x) => x.slaMi)),
    };
  }, [dataset]);

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        Фильтры
      </Typography.Title>
      <Button onClick={f.reset} size="small" block>
        Сбросить
      </Button>

      <Divider style={{ margin: '12px 0' }} />

      <div className="sidebar-section">
        <div className="sidebar-label">Тип клиента</div>
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          placeholder="все"
          value={f.clientTypes}
          options={options(choices.clientTypes)}
          onChange={(v) => f.setMany({ clientTypes: v })}
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Единица времени</div>
        <Select
          style={{ width: '100%' }}
          value={f.timeUnit}
          onChange={(v) => f.setTimeUnit(v)}
          options={[
            { label: 'День', value: 'day' },
            { label: 'Неделя', value: 'week' },
            { label: 'Месяц', value: 'month' },
            { label: 'Квартал', value: 'quarter' },
            { label: 'Год', value: 'year' },
          ]}
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Дата регистрации</div>
        <RangePicker
          style={{ width: '100%' }}
          value={[f.dateFrom ? dayjs(f.dateFrom) : null, f.dateTo ? dayjs(f.dateTo) : null]}
          onChange={(range) => {
            f.setMany({
              dateFrom: range?.[0]?.format('YYYY-MM-DD') ?? null,
              dateTo: range?.[1]?.format('YYYY-MM-DD') ?? null,
            });
          }}
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Клиент</div>
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          placeholder={`${choices.clients.length} вариантов`}
          value={f.clients}
          options={options(choices.clients)}
          onChange={(v) => f.setMany({ clients: v })}
          maxTagCount="responsive"
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Регион</div>
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          placeholder={`${choices.regions.length} вариантов`}
          value={f.regions}
          options={options(choices.regions)}
          onChange={(v) => f.setMany({ regions: v })}
          maxTagCount="responsive"
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Статус</div>
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          placeholder={`${choices.statuses.length} вариантов`}
          value={f.statuses}
          options={options(choices.statuses)}
          onChange={(v) => f.setMany({ statuses: v })}
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Срок решения</div>
        <Select
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          placeholder="5 вариантов"
          value={f.resolutionBuckets}
          options={RESOLUTION_ORDER.filter((v) => v !== 'Не определено').map((v) => ({ value: v, label: v }))}
          onChange={(v) => f.setMany({ resolutionBuckets: v })}
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">ЕИ</div>
        <Select
          mode="multiple"
          allowClear
          showSearch
          style={{ width: '100%' }}
          placeholder={`${choices.eiIds.length} вариантов`}
          value={f.eiIds}
          options={options(choices.eiIds)}
          onChange={(v) => f.setMany({ eiIds: v })}
          maxTagCount="responsive"
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">МИ</div>
        <Select
          mode="multiple"
          allowClear
          showSearch
          style={{ width: '100%' }}
          placeholder={`${choices.miIds.length} вариантов`}
          value={f.miIds}
          options={options(choices.miIds)}
          onChange={(v) => f.setMany({ miIds: v })}
          maxTagCount="responsive"
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">SLA ЕИ</div>
        <Select
          mode="multiple"
          allowClear
          showSearch
          style={{ width: '100%' }}
          placeholder={`${choices.slaEi.length} вариантов`}
          value={f.slaEi}
          options={options(choices.slaEi)}
          onChange={(v) => f.setMany({ slaEi: v })}
          maxTagCount="responsive"
        />
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">SLA МИ</div>
        <Select
          mode="multiple"
          allowClear
          showSearch
          style={{ width: '100%' }}
          placeholder={`${choices.slaMi.length} вариантов`}
          value={f.slaMi}
          options={options(choices.slaMi)}
          onChange={(v) => f.setMany({ slaMi: v })}
          maxTagCount="responsive"
        />
      </div>
    </div>
  );
}
