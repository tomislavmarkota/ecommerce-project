import { useEffect, useState } from 'react';
import { fetchCatalogProducts, PublicCatalogProduct } from '../../../api/catalog';
import ProductCard from '../../../components/productCard/ProductCard';
import styles from './PublicProducts.module.scss';

export default function PublicProducts() {
  const [products, setProducts] = useState<PublicCatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [page, setPage] = useState(1);

  const [meta, setMeta] = useState({
    total: 0,
    totalPages: 0,
    limit: 12,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(inputValue.trim());
    }, 400);

    return () => clearTimeout(timeout);
  }, [inputValue]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);

        const res = await fetchCatalogProducts({
          page,
          limit: 12,
          search,
        });

        setProducts(res.data);
        setMeta({
          total: res.total,
          totalPages: res.totalPages,
          limit: res.limit,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [page, search]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Products</h1>
          <p>{meta.total} products available</p>
        </div>

        <input
          type="text"
          placeholder="Search products"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className={styles.search}
        />
      </div>

      {loading ? (
        <div className={styles.empty}>Loading products...</div>
      ) : products.length === 0 ? (
        <div className={styles.empty}>No products available.</div>
      ) : (
        <>
          <div className={styles.grid}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className={styles.pagination}>
            <button onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
              Prev
            </button>

            <span>
              Page <strong>{page}</strong> of <strong>{meta.totalPages || 1}</strong>
            </span>

            <button
              onClick={() => setPage((prev) => Math.min(meta.totalPages || 1, prev + 1))}
              disabled={page >= (meta.totalPages || 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
