import { ColumnDef } from '@tanstack/react-table';
import { AdminOrder } from '../../../api/order';

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const orderColumns: ColumnDef<AdminOrder>[] = [
  {
    id: 'id',
    header: 'Order',
    accessorKey: 'id',
    cell: ({ row }) => `#${row.original.id}`,
  },
  {
    id: 'customer_name',
    header: 'Customer',
    accessorKey: 'customer_name',
    cell: ({ row }) => row.original.customer_name || 'Guest',
  },
  {
    id: 'customer_email',
    header: 'Email',
    accessorKey: 'customer_email',
    cell: ({ row }) => row.original.customer_email || '-',
  },
  {
    id: 'customer_group_code',
    header: 'Group',
    accessorKey: 'customer_group_code',
    cell: ({ row }) => row.original.customer_group_code || '-',
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
  },
  {
    id: 'total_items',
    header: 'Items',
    accessorKey: 'total_items',
  },
  {
    id: 'grand_total',
    header: 'Total',
    accessorKey: 'grand_total',
    cell: ({ row }) => formatCurrency(row.original.grand_total, row.original.currency),
  },
  {
    id: 'created_at',
    header: 'Date',
    accessorKey: 'created_at',
    cell: ({ row }) => formatDate(row.original.created_at),
  },
];
