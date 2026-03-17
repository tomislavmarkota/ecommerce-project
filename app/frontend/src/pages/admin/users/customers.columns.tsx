import { ColumnDef } from '@tanstack/react-table';
import { normalizeBadgeKey } from '../../../utils/badge';
import styles from './Customers.module.scss';

export type CustomerRow = {
  id: number;
  name: string;
  email: string;
  role: string;
};

const getBadgeClass = (value: string) => {
  const key = normalizeBadgeKey(value) as keyof typeof styles;
  return styles[key] || styles['defaultBadge'];
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
    accessorKey: 'role',
    header: 'Role',
    cell: ({ getValue }) => {
      const role = getValue() as string;
      return <span className={`${styles.badge} ${getBadgeClass(role)}`}>{role}</span>;
    },
  },
];
