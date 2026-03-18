import { use, useEffect, useState } from 'react';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import DataTable from '../../../components/dataTable/DataTable';
import PageTitle from '../../../components/pageTitle/PageTitle';
import { ConfirmModal } from '../../../components/dialog/ConfirmModal';
import { useUsers } from '../../../hooks/useUsers';
import { useDeleteUsers } from '../../../hooks/useDeleteUsers';
import { customerColumns } from './customers.columns';
import styles from './Customers.module.scss';
import { UserContext } from '../../../context/userProvider.context';

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default function Customers() {
  const navigate = useNavigate();

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [selectedUsers, setSelectedUsers] = useState<UserRow[]>([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const user = use(UserContext);
  const { data, isLoading } = useUsers(pagination, globalFilter, sorting);
  const deleteUsersMutation = useDeleteUsers();

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.ceil(total / pagination.pageSize);

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [globalFilter]);

  const handleOpenDeleteModal = () => {
    if (selectedUsers.length === 0) return;
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const ids = selectedUsers.map((user) => user.id);

    if (ids.length === 0) return;

    try {
      await deleteUsersMutation.mutateAsync({
        ids,
        token: user.accessToken || '',
      });

      setSelectedUsers([]);
      setSelectionResetKey((prev) => prev + 1);
      setDeleteModalOpen(false);

      if (users.length === ids.length && pagination.pageIndex > 0) {
        setPagination((prev) => ({
          ...prev,
          pageIndex: prev.pageIndex - 1,
        }));
      }
    } catch (error) {
      console.error('Failed to delete users:', error);
    }
  };

  return (
    <div className={styles.page}>
      <PageTitle name="Customers" />

      <DataTable
        title="Customers"
        subtitle={`${total} total records`}
        data={users}
        columns={customerColumns}
        isLoading={isLoading || deleteUsersMutation.isPending}
        emptyMessage="No customers found"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        searchPlaceholder="Search customers"
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
        pageCount={pageCount}
        totalRows={total}
        enableRowSelection
        getRowId={(row) => String(row.id)}
        onSelectedRowsChange={setSelectedUsers}
        resetRowSelectionKey={selectionResetKey}
        renderBulkActions={(rows) => (
          <button
            type="button"
            className={styles.dangerButton}
            onClick={handleOpenDeleteModal}
            disabled={deleteUsersMutation.isPending || rows.length === 0}
          >
            Delete ({rows.length})
          </button>
        )}
        onRowClick={(row) => navigate(`/users/${row.id}`)}
      />

      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleteUsersMutation.isPending) {
            setDeleteModalOpen(false);
          }
        }}
        onConfirm={handleConfirmDelete}
        isLoading={deleteUsersMutation.isPending}
        title="Delete selected users"
        confirmLabel={`Delete (${selectedUsers.length})`}
        cancelLabel="Cancel"
        confirmVariant="danger"
        message={
          <>
            Are you sure you want to delete <strong>{selectedUsers.length}</strong> selected user
            {selectedUsers.length === 1 ? '' : 's'}? This action cannot be undone.
          </>
        }
      />
    </div>
  );
}
