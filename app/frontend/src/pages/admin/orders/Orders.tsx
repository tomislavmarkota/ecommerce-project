import { useEffect, useState } from 'react';
import { PaginationState, SortingState } from '@tanstack/react-table';
import PageTitle from '../../../components/pageTitle/PageTitle';
import DataTable from '../../../components/dataTable/DataTable';
import { useOrders } from '../../../hooks/useOrders';
import { orderColumns } from './orders.columns';

export default function OrdersPage() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading } = useOrders(pagination, globalFilter, sorting);

  const orders = data?.data ?? [];
  const total = data?.total ?? 0;

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [globalFilter]);

  return (
    <div>
      <PageTitle name="Orders" />

      <DataTable
        title="Orders"
        subtitle={`${total} total records`}
        data={orders}
        columns={orderColumns}
        isLoading={isLoading}
        emptyMessage="No orders found"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        searchPlaceholder="Search orders"
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
        pageCount={Math.ceil(total / pagination.pageSize)}
        totalRows={total}
      />
    </div>
  );
}
