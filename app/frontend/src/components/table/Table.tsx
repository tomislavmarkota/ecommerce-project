import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';

import { useEffect, useState } from 'react';

import './table.scss';
import { columns } from './columns';

export type Person = {
  id: number;
  name: string;
  age: number;
  role: string;
};

export const data: Person[] = [
  { id: 1, name: 'John', age: 28, role: 'Developer' },
  { id: 2, name: 'Jane', age: 32, role: 'Designer' },
  { id: 3, name: 'Mike', age: 40, role: 'Manager' },
  { id: 4, name: 'Sara', age: 25, role: 'Developer' },
  { id: 5, name: 'Alex', age: 36, role: 'QA' },
  { id: 6, name: 'David', age: 30, role: 'Developer' },
  { id: 7, name: 'Emma', age: 27, role: 'Designer' },
  { id: 8, name: 'Liam', age: 34, role: 'Manager' },
  { id: 9, name: 'Olivia', age: 29, role: 'QA' },
  { id: 10, name: 'Noah', age: 31, role: 'Developer' },
  { id: 11, name: 'Ava', age: 26, role: 'Designer' },
  { id: 12, name: 'William', age: 38, role: 'Manager' },
  { id: 13, name: 'Sophia', age: 24, role: 'QA' },
  { id: 14, name: 'James', age: 33, role: 'Developer' },
  { id: 15, name: 'Isabella', age: 28, role: 'Designer' },
  { id: 16, name: 'Benjamin', age: 41, role: 'Manager' },
  { id: 17, name: 'Mia', age: 23, role: 'QA' },
  { id: 18, name: 'Lucas', age: 35, role: 'Developer' },
  { id: 19, name: 'Charlotte', age: 29, role: 'Designer' },
  { id: 20, name: 'Henry', age: 37, role: 'Manager' },
  { id: 21, name: 'Amelia', age: 27, role: 'QA' },
  { id: 22, name: 'Alexander', age: 34, role: 'Developer' },
  { id: 23, name: 'Evelyn', age: 31, role: 'Designer' },
  { id: 24, name: 'Daniel', age: 39, role: 'Manager' },
  { id: 25, name: 'Harper', age: 25, role: 'QA' },
  { id: 26, name: 'Matthew', age: 36, role: 'Developer' },
  { id: 27, name: 'Abigail', age: 28, role: 'Designer' },
  { id: 28, name: 'Joseph', age: 42, role: 'Manager' },
  { id: 29, name: 'Emily', age: 26, role: 'QA' },
  { id: 30, name: 'Samuel', age: 33, role: 'Developer' },
  { id: 31, name: 'Ella', age: 24, role: 'Designer' },
  { id: 32, name: 'David Jr.', age: 40, role: 'Manager' },
  { id: 33, name: 'Scarlett', age: 29, role: 'QA' },
  { id: 34, name: 'Andrew', age: 35, role: 'Developer' },
  { id: 35, name: 'Victoria', age: 32, role: 'Designer' },
  { id: 36, name: 'Joshua', age: 41, role: 'Manager' },
  { id: 37, name: 'Grace', age: 27, role: 'QA' },
  { id: 38, name: 'Christopher', age: 34, role: 'Developer' },
  { id: 39, name: 'Chloe', age: 30, role: 'Designer' },
  { id: 40, name: 'Anthony', age: 38, role: 'Manager' },
  { id: 41, name: 'Lily', age: 23, role: 'QA' },
  { id: 42, name: 'Ryan', age: 31, role: 'Developer' },
  { id: 43, name: 'Hannah', age: 28, role: 'Designer' },
  { id: 44, name: 'Nathan', age: 37, role: 'Manager' },
  { id: 45, name: 'Zoe', age: 26, role: 'QA' },
  { id: 46, name: 'Aaron', age: 33, role: 'Developer' },
  { id: 47, name: 'Leah', age: 29, role: 'Designer' },
  { id: 48, name: 'Caleb', age: 39, role: 'Manager' },
  { id: 49, name: 'Natalie', age: 24, role: 'QA' },
  { id: 50, name: 'Ethan', age: 35, role: 'Developer' },
];

type Props = {
  value: string;
  onChange: (value: string) => void;
  debounce?: number;
};

function DebouncedInput({ value, onChange, debounce = 400 }: Props) {
  const [val, setVal] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(val);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [val]);

  return (
    <input className="table-search" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Search..." />
  );
}

export default function Table() {
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="table-wrapper">
      <DebouncedInput value={globalFilter ?? ''} onChange={(val) => setGlobalFilter(val)} />
      <div className="table-overflow">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}

                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        {/* First / Prev */}

        <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
          First
        </button>

        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Prev
        </button>

        {/* Page Info */}

        <span>
          Page{' '}
          <strong>
            {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </strong>
        </span>

        {/* Jump to Page */}

        <span>
          | Go to page:
          <input
            type="number"
            defaultValue={table.getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              table.setPageIndex(page);
            }}
            className="page-input"
          />
        </span>

        {/* Next / Last */}

        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </button>

        <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
          Last
        </button>

        {/* Page Size */}

        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
