import { ColumnDef } from '@tanstack/react-table';
import { ProductRow } from '../../../api/product';
import { normalizeBadgeKey } from '../../../utils/badge';
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

const getBadgeClass = (value?: string | null) => {
  const key = normalizeBadgeKey(value) as keyof typeof styles;
  return styles[key] || styles.defaultBadge;
};

export const productColumns: ColumnDef<ProductRow>[] = [
  {
    accessorKey: 'name',
    header: 'Product',
    cell: ({ row }) => {
      const product = row.original;

      return (
        <div className={styles.productCell}>
          {product.thumbnail ? (
            <img src={product.thumbnail} alt={product.name} className={styles.productThumbnail} />
          ) : (
            <div className={styles.thumbnailPlaceholder}>N/A</div>
          )}

          <div className={styles.productMeta}>
            <div className={styles.productName}>{product.name}</div>
            <div className={styles.productCategory}>{product.category_name || 'No category'}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'price_net',
    header: 'Net price',
    cell: ({ getValue }) => formatCurrency(getValue() as number | null),
  },
  {
    accessorKey: 'vat_rate',
    header: 'VAT',
    cell: ({ getValue }) => `${Number(getValue() ?? 0)}%`,
  },
  {
    accessorKey: 'price_gross',
    header: 'Gross price',
    cell: ({ getValue }) => formatCurrency(getValue() as number | null),
  },
  {
    accessorKey: 'stock',
    header: 'Stock',
    cell: ({ getValue }) => {
      const stock = Number(getValue() ?? 0);
      const label = stock > 0 ? 'In stock' : 'Out of stock';

      return <span className={`${styles.badge} ${getBadgeClass(label)}`}>{label}</span>;
    },
  },
  {
    accessorKey: 'is_published',
    header: 'Status',
    cell: ({ getValue }) => {
      const published = Boolean(getValue());
      const label = published ? 'Published' : 'Draft';

      return <span className={`${styles.badge} ${getBadgeClass(label)}`}>{label}</span>;
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ getValue }) => formatDate(getValue() as string),
  },
];
