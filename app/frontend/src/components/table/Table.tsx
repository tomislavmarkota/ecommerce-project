import { useReactTable, getCoreRowModel, flexRender, SortingState } from '@tanstack/react-table';
import { useEffect, useState } from 'react';

import './table.scss';
import { columns } from './columns';
import { useUsers } from '../../hooks/useUsers';
import axios from 'axios';

export type Person = {
  id: number;
  name: string;
  email: string;
  role: string;
};

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
  const [sorting, setSorting] = useState<SortingState>([]);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const { data, isLoading } = useUsers(pagination, globalFilter, sorting);

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [globalFilter]);

  const table = useReactTable({
    data: users,
    columns,

    state: {
      pagination,
      sorting,
      globalFilter,
    },

    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,

    pageCount: Math.ceil(total / pagination.pageSize),

    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,

    getCoreRowModel: getCoreRowModel(),
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
            {isLoading ? (
              <tr>
                <td colSpan={columns.length}>Loading...</td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
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
