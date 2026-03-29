import { useEffect, useState } from 'react';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import PageTitle from '../../../components/pageTitle/PageTitle';
import DataTable from '../../../components/dataTable/DataTable';
import { useProducts } from '../../../hooks/useProducts';
import { productColumns } from './product.columns';
import styles from './product.module.scss';

function Product() {
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
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
    <div>
      <PageTitle name="Product" />
      <button type="button" className={`${styles.btn} ${styles.primaryButton}`} onClick={() => navigate('add-product')}>
        Add product
      </button>

      <DataTable
        title="Products"
        subtitle={`${total} total records`}
        data={products}
        columns={productColumns}
        isLoading={isLoading}
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
        onRowClick={(row) => navigate(`/product/${row.id}`)}
      />
    </div>
  );
}

export default Product;
