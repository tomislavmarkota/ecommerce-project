import {
  ColumnDef,
  PaginationState,
  RowSelectionState,
  SortingState,
  Updater,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
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
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  pagination: PaginationState;
  onPaginationChange: (updater: Updater<PaginationState>) => void;
  pageCount: number;
  totalRows?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: TData) => void;
  showToolbar?: boolean;
  showFooter?: boolean;
  enableRowSelection?: boolean;
  getRowId?: (row: TData, index: number) => string;
  onSelectedRowsChange?: (rows: TData[]) => void;
  renderBulkActions?: (selectedRows: TData[]) => React.ReactNode;
  resetRowSelectionKey?: string | number;
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
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  pageCount,
  totalRows,
  pageSizeOptions = [10, 20, 30, 40, 50],
  onRowClick,
  showToolbar = true,
  showFooter = true,
  enableRowSelection = false,
  getRowId,
  onSelectedRowsChange,
  renderBulkActions,
  resetRowSelectionKey,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const selectionColumn = useMemo<ColumnDef<TData, any>>(
    () => ({
      id: '__select',
      header: ({ table }) => (
        <div className={styles.checkboxWrap} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el) {
                el.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected();
              }
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className={styles.checkboxWrap} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
          />
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false,
      size: 48,
    }),
    [],
  );

  const tableColumns = useMemo(
    () => (enableRowSelection ? [selectionColumn, ...columns] : columns),
    [enableRowSelection, selectionColumn, columns],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      pagination,
      globalFilter,
      ...(enableRowSelection ? { rowSelection } : {}),
    },
    onSortingChange,
    onPaginationChange,
    ...(getRowId ? { getRowId } : {}),
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    enableRowSelection,
    manualSorting: true,
    manualPagination: true,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedRows = useMemo(
    () => table.getSelectedRowModel().rows.map((row) => row.original),
    [rowSelection, data, table],
  );

  useEffect(() => {
    if (enableRowSelection) {
      setRowSelection({});
    }
  }, [resetRowSelectionKey, enableRowSelection]);

  const selectedCount = selectedRows.length;

  useEffect(() => {
    onSelectedRowsChange?.(selectedRows);
  }, [onSelectedRowsChange, selectedRows]);

  const colSpan = tableColumns.length;

  return (
    <div className={styles.card}>
      {(showToolbar || title) && (
        <div className={styles.cardHeader}>
          <div className={styles.headerMeta}>
            {title && <h3 className={styles.cardTitle}>{title}</h3>}
            {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
            {!subtitle && typeof totalRows === 'number' && (
              <p className={styles.cardSubtitle}>{totalRows} total records</p>
            )}
          </div>

          <div className={styles.headerSearch}>
            {showToolbar && onGlobalFilterChange && (
              <DebouncedInput value={globalFilter} onChange={onGlobalFilterChange} placeholder={searchPlaceholder} />
            )}
          </div>

          <div className={styles.headerRight}>
            {enableRowSelection && renderBulkActions && (
              <div
                className={`${styles.bulkActionsInline} ${
                  selectedCount > 0 ? styles.bulkActionsInlineVisible : styles.bulkActionsInlineHidden
                }`}
              >
                {selectedCount > 0 ? renderBulkActions(selectedRows) : null}
              </div>
            )}

            {enableRowSelection && (
              <div className={styles.selectionSummary}>
                Selected: <strong>{selectedCount}</strong>
              </div>
            )}
          </div>
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
                  className={`${styles.tableRow} ${onRowClick ? styles.clickable : ''} ${
                    row.getIsSelected() ? styles.selectedRow : ''
                  }`}
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

      {showFooter && pageCount > 0 && (
        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            Page <strong>{pagination.pageIndex + 1}</strong> of <strong>{pageCount}</strong>
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

            <button onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()}>
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
