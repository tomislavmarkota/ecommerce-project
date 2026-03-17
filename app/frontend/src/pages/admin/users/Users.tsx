import { useEffect, useState } from 'react';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import DataTable from '../../../components/dataTable/DataTable';
import PageTitle from '../../../components/pageTitle/PageTitle';
import { useUsers } from '../../../hooks/useUsers';
import { customerColumns } from './customers.columns';

export default function Customers() {
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
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

  return (
    <div>
      <PageTitle name="Customers" />

      <DataTable
        title="Customers"
        subtitle={`${total} total records`}
        data={users}
        columns={customerColumns}
        isLoading={isLoading}
        emptyMessage="No customers found"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        searchPlaceholder="Search customers"
        sorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        pagination={pagination}
        onPaginationChange={setPagination}
        manualPagination
        pageCount={Math.ceil(total / pagination.pageSize)}
        totalRows={total}
        onRowClick={(row) => navigate(`/users/${row.id}`)}
      />
    </div>
  );
}
