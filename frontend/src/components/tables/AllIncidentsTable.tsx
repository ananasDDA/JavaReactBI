import { useMemo } from 'react';
import { Table } from 'antd';
import type { DataSetMeta, Incident } from '../../types';
import { detailColumns } from './columns';

interface Props {
  filtered: Incident[];
  meta: DataSetMeta | undefined;
}

export function AllIncidentsTable({ filtered, meta }: Props) {
  const columns = useMemo(() => detailColumns(meta), [meta]);

  return (
    <Table<Incident>
      size="small"
      rowKey={(r) => `${r.eiId}:${r.createdAt ?? ''}`}
      dataSource={filtered}
      columns={columns}
      pagination={{ pageSize: 20, showSizeChanger: true }}
      scroll={{ x: 'max-content' }}
      bordered
    />
  );
}
