import { useMemo } from 'react';
import { Table } from 'antd';
import type { DataSetMeta, Incident } from '../../types';
import { detailColumns } from './columns';

interface Props {
  filtered: Incident[];
  meta: DataSetMeta | undefined;
}

const OPEN_STATUSES = new Set(['Назначен', 'В работе', 'Активное ожидание', 'Зарегистрирован']);

export function OpenIncidentsTable({ filtered, meta }: Props) {
  const rows = useMemo(
    () => filtered.filter((i) => (i.status && OPEN_STATUSES.has(i.status)) || !!i.countOpen || i.isOpen),
    [filtered],
  );
  const columns = useMemo(() => detailColumns(meta), [meta]);

  return (
    <Table<Incident>
      size="small"
      rowKey="eiId"
      dataSource={rows}
      columns={columns}
      pagination={{ pageSize: 10, showSizeChanger: true }}
      scroll={{ x: 'max-content' }}
      bordered
    />
  );
}
