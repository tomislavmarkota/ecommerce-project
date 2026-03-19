import { useEffect, useState } from 'react';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import PageTitle from '../../../components/pageTitle/PageTitle';
import DataTable from '../../../components/dataTable/DataTable';
import { useProducts } from '../../../hooks/useProducts';
import { useDeleteProducts } from '../../../hooks/useDeleteProducts';
import { productColumns } from './product.columns';
import styles from './Product.module.scss';
import { ProductRow } from '../../../api/product';
import { ConfirmModal } from '../../../components/dialog/ConfirmModal';

function Product() {
  const navigate = useNavigate();

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedProducts, setSelectedProducts] = useState<ProductRow[]>([]);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data, isLoading } = useProducts(pagination, globalFilter, sorting);
  const deleteProductsMutation = useDeleteProducts();

  const products = data?.data ?? [];
  const total = data?.total ?? 0;

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [globalFilter]);

  const handleConfirmDelete = async () => {
    const ids = selectedProducts.map((product) => product.id);
    if (!ids.length) return;

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
      <div className={styles.pageHeader}>
        <PageTitle name="Product" />

        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={() => navigate('/product/add-product')}>
            Add product
          </button>

          <button className={styles.secondaryButton}>Add category</button>
          <button className={styles.secondaryButton}>Add subcategory</button>
        </div>
      </div>

      <DataTable
        title="Products"
        subtitle={`${total} total products`}
        data={products}
        columns={productColumns}
        isLoading={isLoading || deleteProductsMutation.isPending}
        emptyMessage="No products found"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        searchPlaceholder="Search products"
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
        pageCount={Math.ceil(total / pagination.pageSize)}
        totalRows={total}
        enableRowSelection
        getRowId={(row) => String(row.id)}
        onSelectedRowsChange={setSelectedProducts}
        resetRowSelectionKey={selectionResetKey}
        renderBulkActions={(rows) => (
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => setDeleteModalOpen(true)}
            disabled={deleteProductsMutation.isPending || rows.length === 0}
          >
            Delete ({rows.length})
          </button>
        )}
        onRowClick={(row) => navigate(`/product/${row.id}`)}
      />

      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => !deleteProductsMutation.isPending && setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteProductsMutation.isPending}
        title="Delete selected products"
        confirmLabel={`Delete (${selectedProducts.length})`}
        cancelLabel="Cancel"
        confirmVariant="danger"
        message={
          <>
            Are you sure you want to delete <strong>{selectedProducts.length}</strong> selected product
            {selectedProducts.length === 1 ? '' : 's'}?
          </>
        }
      />
    </div>
  );
}

export default Product;
