import { ColumnDef } from '@tanstack/react-table';
import { ProductRow } from '../../../api/product';
import styles from './Product.module.scss';

const formatCurrency = (value: number | null) => {
  if (value == null) return '-';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export const productColumns: ColumnDef<ProductRow>[] = [
  {
    accessorKey: 'name',
    header: 'Product',
    cell: ({ row }) => {
      const product = row.original;

      return (
        <div className={styles.productCell}>
          <div className={styles.productThumb}>
            {product.thumbnail ? (
              <img src={product.thumbnail} alt={product.name} className={styles.productImage} />
            ) : (
              <div className={styles.productImagePlaceholder}>N/A</div>
            )}
          </div>

          <div className={styles.productMeta}>
            <span className={styles.productName}>{product.name}</span>
            <span className={styles.productCategory}>
              {product.category_name || 'No category'}
              {product.subcategory_name ? ` / ${product.subcategory_name}` : ''}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'retail_price_gross',
    header: 'Retail price',
    cell: ({ getValue }) => formatCurrency(getValue() as number | null),
  },
  {
    accessorKey: 'business_price_gross',
    header: 'Business price',
    cell: ({ getValue }) => formatCurrency(getValue() as number | null),
  },
  {
    accessorKey: 'stock',
    header: 'Stock',
  },
  {
    accessorKey: 'is_published',
    header: 'Status',
    cell: ({ getValue }) => {
      const published = Boolean(getValue());

      return (
        <span className={`${styles.badge} ${published ? styles.published : styles.draft}`}>
          {published ? 'Published' : 'Draft'}
        </span>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ getValue }) => formatDate(getValue() as string),
  },
];
