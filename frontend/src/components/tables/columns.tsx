import type { ColumnsType } from 'antd/es/table';
import type { DataSetMeta, Incident } from '../../types';
import { compareResolution } from '../../lib/resolutionOrder';

export function remedyLink(template: string | undefined, id: string | null | undefined) {
  if (!id) return null;
  if (!template) return id;
  const href = template.replace('{id}', id);
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {id}
    </a>
  );
}

export function detailColumns(meta: DataSetMeta | undefined): ColumnsType<Incident> {
  const eiTpl = meta?.remedyEiUrl;
  const miTpl = meta?.remedyMiUrl;
  return [
    {
      title: 'Дата регистрации',
      dataIndex: 'createdAt',
      width: 160,
      sorter: (a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
      defaultSortOrder: 'descend',
    },
    {
      title: 'ЕИ',
      dataIndex: 'eiId',
      width: 160,
      render: (id: string) => remedyLink(eiTpl, id),
    },
    { title: 'Статус', dataIndex: 'status', width: 110 },
    { title: 'Клиент', dataIndex: 'client', width: 140, ellipsis: true },
    { title: 'Регион', dataIndex: 'region', width: 160, ellipsis: true },
    {
      title: 'Длительность решения, ч',
      dataIndex: 'resolutionHours',
      width: 140,
      align: 'right',
      render: (v: number | null) => (v == null ? '—' : v.toFixed(2)),
      sorter: (a, b) => (a.resolutionHours ?? 0) - (b.resolutionHours ?? 0),
    },
    {
      title: 'Срок решения',
      dataIndex: 'resolutionBucket',
      width: 110,
      sorter: (a, b) => compareResolution(a.resolutionBucket, b.resolutionBucket),
    },
    { title: 'Гр. исполнителя', dataIndex: 'groupExecutor', width: 220, ellipsis: true },
    { title: 'Гр. контролирующего', dataIndex: 'groupController', width: 220, ellipsis: true },
    {
      title: 'МИ',
      dataIndex: 'miId',
      width: 160,
      render: (id: string | null) => remedyLink(miTpl, id),
    },
    { title: 'SLA ЕИ', dataIndex: 'slaEi', width: 90 },
    { title: 'SLA МИ', dataIndex: 'slaMi', width: 90 },
    { title: 'Тип клиента', dataIndex: 'clientType', width: 110 },
    { title: 'Подстатус', dataIndex: 'substatus', width: 180, ellipsis: true },
  ];
}
