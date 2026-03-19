import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { fetchCatalogProduct, PublicCatalogProduct } from '../../../api/catalog';
import { useCart } from '../../../context/cartProvider.context';
import styles from './PublicProductDetails.module.scss';

export default function PublicProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<PublicCatalogProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        if (!id) return;
        const data = await fetchCatalogProduct(Number(id));
        setProduct(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  if (loading) {
    return <div>Loading product...</div>;
  }

  if (!product) {
    return <div>Product not found.</div>;
  }

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      quantity,
      name: product.name,
      thumbnail: product.thumbnail,
      price: product.pricing.finalGross,
    });

    navigate('/cart');
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.imageWrap}>
          {product.thumbnail ? (
            <img src={product.thumbnail} alt={product.name} className={styles.image} />
          ) : (
            <div className={styles.imagePlaceholder}>No image</div>
          )}
        </div>

        <div className={styles.content}>
          <span className={styles.category}>
            {product.categoryName || 'Uncategorized'}
            {product.subcategoryName ? ` / ${product.subcategoryName}` : ''}
          </span>

          <h1 className={styles.title}>{product.name}</h1>

          <div className={styles.priceRow}>
            {product.pricing.appliedDiscount ? (
              <>
                <span className={styles.oldPrice}>€{product.pricing.originalGross.toFixed(2)}</span>
                <span className={styles.price}>€{product.pricing.finalGross.toFixed(2)}</span>
              </>
            ) : (
              <span className={styles.price}>€{product.pricing.finalGross.toFixed(2)}</span>
            )}
          </div>

          {product.pricing.appliedDiscount && (
            <div className={styles.discountBadge}>{product.pricing.appliedDiscount.name}</div>
          )}

          <p className={styles.description}>{product.description || 'No description available.'}</p>

          <div className={styles.stock}>{product.stock > 0 ? `In stock: ${product.stock}` : 'Out of stock'}</div>

          <div className={styles.cartRow}>
            <input
              type="number"
              min={1}
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className={styles.qtyInput}
            />

            <button className={styles.button} disabled={product.stock <= 0} onClick={handleAddToCart}>
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
