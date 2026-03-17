import {
  ColumnDef,
  PaginationState,
  SortingState,
  Updater,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import DebouncedInput from './DebouncedInput';
import styles from './DataTable.module.scss';

type DataTableProps<TData extends object> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];

  title?: string;
  subtitle?: string;

  isLoading?: boolean;
  emptyMessage?: string;

  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  searchPlaceholder?: string;

  sorting?: SortingState;
  onSortingChange?: (updater: Updater<SortingState>) => void;
  manualSorting?: boolean;

  pagination?: PaginationState;
  onPaginationChange?: (updater: Updater<PaginationState>) => void;
  manualPagination?: boolean;
  pageCount?: number;
  totalRows?: number;
  pageSizeOptions?: number[];

  onRowClick?: (row: TData) => void;

  showToolbar?: boolean;
  showFooter?: boolean;
};

export default function DataTable<TData extends object>({
  data,
  columns,
  title,
  subtitle,
  isLoading = false,
  emptyMessage = 'No data found',
  globalFilter = '',
  onGlobalFilterChange,
  searchPlaceholder = 'Search...',
  sorting = [],
  onSortingChange,
  manualSorting = false,
  pagination,
  onPaginationChange,
  manualPagination = false,
  pageCount,
  totalRows,
  pageSizeOptions = [10, 20, 30, 40, 50],
  onRowClick,
  showToolbar = true,
  showFooter = true,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      ...(pagination ? { pagination } : {}),
    },
    onSortingChange,
    ...(onPaginationChange ? { onPaginationChange } : {}),
    manualSorting,
    manualPagination,
    ...(typeof pageCount === 'number' ? { pageCount } : {}),
    getCoreRowModel: getCoreRowModel(),
  });

  const colSpan = columns.length;
  const resolvedPageCount = pageCount ?? table.getPageCount();

  return (
    <div className={styles.card}>
      {(showToolbar || title) && (
        <div className={styles.cardHeader}>
          <div>
            {title && <h3 className={styles.cardTitle}>{title}</h3>}
            {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
            {!subtitle && typeof totalRows === 'number' && (
              <p className={styles.cardSubtitle}>{totalRows} total records</p>
            )}
          </div>

          {showToolbar && onGlobalFilterChange && (
            <DebouncedInput value={globalFilter} onChange={onGlobalFilterChange} placeholder={searchPlaceholder} />
          )}
        </div>
      )}

      <div className={styles.tableOverflow}>
        <table className={styles.table}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();

                  return (
                    <th
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={canSort ? styles.sortable : undefined}
                    >
                      <div className={styles.thContent}>
                        <span>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </span>

                        {canSort && (
                          <span className={`${styles.sortIndicator} ${sorted ? styles.active : ''}`}>
                            {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className={styles.tableState}>
                  Loading...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className={styles.tableState}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`${styles.tableRow} ${onRowClick ? styles.clickable : ''}`}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showFooter && pagination && onPaginationChange && resolvedPageCount > 0 && (
        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            Page <strong>{pagination.pageIndex + 1}</strong> of <strong>{resolvedPageCount}</strong>
          </div>

          <div className={styles.footerControls}>
            <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              First
            </button>

            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Prev
            </button>

            <div className={styles.pageJump}>
              <span>Go to</span>
              <input
                type="number"
                min={1}
                value={pagination.pageIndex + 1}
                onChange={(e) => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0;
                  table.setPageIndex(page);
                }}
              />
            </div>

            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </button>

            <button onClick={() => table.setPageIndex(resolvedPageCount - 1)} disabled={!table.getCanNextPage()}>
              Last
            </button>

            <select value={pagination.pageSize} onChange={(e) => table.setPageSize(Number(e.target.value))}>
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
