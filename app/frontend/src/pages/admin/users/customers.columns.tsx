import { ColumnDef } from '@tanstack/react-table';
import { normalizeBadgeKey } from '../../../utils/badge';
import styles from './Customers.module.scss';

export type CustomerRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  customerType: 'b2b' | 'b2c';
  companyName: string | null;
};

const getBadgeClass = (value?: string | null) => {
  const key = normalizeBadgeKey(value) as keyof typeof styles;
  return styles[key] || styles.defaultBadge;
};

export const customerColumns: ColumnDef<CustomerRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'customerType',
    header: 'Customer Type',
    cell: ({ getValue }) => {
      const customerType = (getValue() as string | null | undefined) ?? 'unknown';

      return <span className={`${styles.badge} ${getBadgeClass(customerType)}`}>{customerType.toUpperCase()}</span>;
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ getValue }) => {
      const role = (getValue() as string | null | undefined) ?? 'unknown';

      return <span className={`${styles.badge} ${getBadgeClass(role)}`}>{role}</span>;
    },
  },
  {
    accessorKey: 'companyName',
    header: 'Company',
    cell: ({ row }) => {
      const customerType = row.original.customerType;
      const companyName = row.original.companyName;

      if (customerType === 'b2c') {
        return <span className={styles.mutedText}>—</span>;
      }

      return companyName ? companyName : <span className={styles.mutedText}>No company</span>;
    },
  },
];
