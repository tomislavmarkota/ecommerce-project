import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PaginationState, SortingState } from '@tanstack/react-table';
import DataTable from '../../../components/dataTable/DataTable';
import PageTitle from '../../../components/pageTitle/PageTitle';
import { ConfirmModal } from '../../../components/dialog/ConfirmModal';
import { useProducts } from '../../../hooks/useProducts';
import { useDeleteProducts } from '../../../hooks/useDeleteProducts';
import { productColumns } from './product.columns';
import styles from './Product.module.scss';

type SelectedProduct = {
  id: number;
};

function Product() {
  const navigate = useNavigate();

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data, isLoading } = useProducts(pagination, globalFilter, sorting);
  const deleteProductsMutation = useDeleteProducts();

  const products = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.ceil(total / pagination.pageSize);

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [globalFilter]);

  const handleOpenDeleteModal = () => {
    if (selectedProducts.length === 0) return;
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    const ids = selectedProducts.map((product) => product.id);

    if (ids.length === 0) return;

    try {
      await deleteProductsMutation.mutateAsync(ids);

      setSelectedProducts([]);
      setSelectionResetKey((prev) => prev + 1);
      setDeleteModalOpen(false);

      if (products.length === ids.length && pagination.pageIndex > 0) {
        setPagination((prev) => ({
          ...prev,
          pageIndex: prev.pageIndex - 1,
        }));
      }
    } catch (error) {
      console.error('Failed to delete products:', error);
    }
  };

  return (
    <div className={styles.page}>
      <PageTitle name="Products" />
      <button type="button" className={styles.addButton} onClick={() => navigate('add-product')}>
        Add product
      </button>

      <DataTable
        title="Products"
        subtitle={`${total} total products`}
        data={products}
        columns={productColumns}
        isLoading={isLoading}
        emptyMessage="No products found"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        searchPlaceholder="Search products..."
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
        pageCount={pageCount}
        totalRows={total}
        enableRowSelection
        getRowId={(row) => String(row.id)}
        onSelectedRowsChange={setSelectedProducts}
        resetRowSelectionKey={selectionResetKey}
        renderBulkActions={(rows) => (
          <button
            type="button"
            className={styles.dangerButton}
            onClick={(e) => {
              e.stopPropagation();
              if (rows.length > 0) {
                handleOpenDeleteModal();
              }
            }}
          >
            Delete ({rows.length})
          </button>
        )}
        onRowClick={(row) => navigate(`/product/${row.id}`)}
      />

      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          if (!deleteProductsMutation.isPending) {
            setDeleteModalOpen(false);
          }
        }}
        onConfirm={handleConfirmDelete}
        isLoading={deleteProductsMutation.isPending}
        title="Delete selected products"
        confirmLabel={`Delete (${selectedProducts.length})`}
        cancelLabel="Cancel"
        confirmVariant="danger"
        message={
          <>
            Are you sure you want to delete {selectedProducts.length} selected product
            {selectedProducts.length === 1 ? '' : 's'}? This action cannot be undone.
          </>
        }
      />
    </div>
  );
}

export default Product;
