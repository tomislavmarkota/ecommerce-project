import { ColumnDef } from '@tanstack/react-table';
import { normalizeBadgeKey } from '../../../utils/badge';
import styles from './userDetails.module.scss';

export type OrderRow = {
  id: number | string;
  total: number;
  paymentStatus: string;
  fulfilmentStatus: string;
  deliveryType: string;
  date: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const getBadgeClass = (value: string) => {
  const key = normalizeBadgeKey(value) as keyof typeof styles;
  return styles[key] || styles['defaultBadge'];
};

export const orderColumns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: 'id',
    header: 'Order',
    cell: ({ getValue }) => <span className={styles.semibold}>{String(getValue())}</span>,
  },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ getValue }) => formatCurrency(getValue() as number),
  },
  {
    accessorKey: 'paymentStatus',
    header: 'Payment status',
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return <span className={`${styles.badge} ${getBadgeClass(value)}`}>{value}</span>;
    },
  },
  {
    accessorKey: 'fulfilmentStatus',
    header: 'Fulfilment status',
    cell: ({ getValue }) => {
      const value = getValue() as string;
      return <span className={`${styles.badge} ${getBadgeClass(value)}`}>{value}</span>;
    },
  },
  {
    accessorKey: 'deliveryType',
    header: 'Delivery type',
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ getValue }) => formatDate(getValue() as string),
  },
];
