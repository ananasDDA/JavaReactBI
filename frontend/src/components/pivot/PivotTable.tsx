import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Pivot } from '../../lib/aggregate';

interface Props {
  pivot: Pivot;
  rowHeader: string;
  rowHeaderKey?: string;
}

interface Row {
  key: string;
  header: string;
  isTotal: boolean;
  cells: Record<string, { count: number; percent: number }>;
}

export function PivotTable({ pivot, rowHeader }: Props) {
  const rows: Row[] = pivot.rows.map((r) => ({
    key: r,
    header: r,
    isTotal: false,
    cells: pivot.data[r],
  }));
  rows.push({ key: '__total__', header: 'Общий итог', isTotal: true, cells: pivot.totals });

  const columns: ColumnsType<Row> = [
    {
      title: rowHeader,
      dataIndex: 'header',
      fixed: 'left',
      width: 200,
      render: (_, row) => <span style={{ fontWeight: row.isTotal ? 600 : 400 }}>{row.header}</span>,
    },
    ...pivot.columns.flatMap<ColumnsType<Row>[number]>((col) => [
      {
        title: <span>{col}<br /><span style={{ fontWeight: 400, color: '#8c8c8c', fontSize: 12 }}>ЕИ</span></span>,
        key: `${col}__count`,
        align: 'right' as const,
        width: 80,
        render: (_, row) => <span style={{ fontWeight: row.isTotal ? 600 : 400 }}>{row.cells[col]?.count ?? 0}</span>,
      },
      {
        title: <span>&nbsp;<br /><span style={{ fontWeight: 400, color: '#8c8c8c', fontSize: 12 }}>%</span></span>,
        key: `${col}__percent`,
        align: 'right' as const,
        width: 70,
        render: (_, row) => (
          <span style={{ fontWeight: row.isTotal ? 600 : 400 }}>
            {row.cells[col]?.count ? row.cells[col].percent : ''}
          </span>
        ),
      },
    ]),
  ];

  return (
    <div className="pivot-scroll">
      <Table<Row>
        size="small"
        rowClassName={(r) => (r.isTotal ? 'pivot-total' : '')}
        dataSource={rows}
        columns={columns}
        pagination={false}
        scroll={{ x: 'max-content' }}
        bordered
      />
    </div>
  );
}
