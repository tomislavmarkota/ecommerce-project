import { ColumnDef } from '@tanstack/react-table';
import { normalizeBadgeKey } from '../../../utils/badge';
import styles from './userDetails.module.scss';

export type WishlistRow = {
  id: number | string;
  productName: string;
  category?: string;
  price: number;
  stockStatus?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);

const getBadgeClass = (value: string) => {
  const key = normalizeBadgeKey(value) as keyof typeof styles;
  return styles[key] || styles['defaultBadge'];
};

export const wishlistColumns: ColumnDef<WishlistRow>[] = [
  {
    accessorKey: 'productName',
    header: 'Product',
    cell: ({ getValue }) => <span className={styles.semibold}>{String(getValue())}</span>,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ getValue }) => String(getValue() ?? '-'),
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ getValue }) => formatCurrency(getValue() as number),
  },
  {
    accessorKey: 'stockStatus',
    header: 'Stock status',
    cell: ({ getValue }) => {
      const value = String(getValue() ?? 'Unknown');
      return <span className={`${styles.badge} ${getBadgeClass(value)}`}>{value}</span>;
    },
  },
];
