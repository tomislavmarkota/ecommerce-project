import { useEffect, useState } from 'react';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import PageTitle from '../../../components/pageTitle/PageTitle';
import DataTable from '../../../components/dataTable/DataTable';
import { useProducts } from '../../../hooks/useProducts';
import { productColumns } from './product.columns';
import styles from './Product.module.scss';

function Product() {
  const navigate = useNavigate();

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading } = useProducts(pagination, globalFilter, sorting);

  const products = data?.data ?? [];
  const total = data?.total ?? 0;

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [globalFilter]);

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
        isLoading={isLoading}
        emptyMessage="No products found"
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        searchPlaceholder="Search products"
        sorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        pagination={pagination}
        onPaginationChange={setPagination}
        manualPagination
        pageCount={Math.ceil(total / pagination.pageSize)}
        totalRows={total}
        onRowClick={(row) => navigate(`/product/${row.id}`)}
      />
    </div>
  );
}

export default Product;
