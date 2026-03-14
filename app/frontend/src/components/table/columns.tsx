import { createColumnHelper } from '@tanstack/react-table';
export type Person = {
  id: number;
  name: string;
  age: number;
  role: string;
};

const columnHelper = createColumnHelper<Person>();

export const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
  }),
  columnHelper.accessor('name', {
    header: 'Name',
  }),
  columnHelper.accessor('age', {
    header: 'Age',
  }),
  columnHelper.accessor('role', {
    header: 'Role',
  }),
];
