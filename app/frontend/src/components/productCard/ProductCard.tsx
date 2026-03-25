import { MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { PublicCatalogProduct } from '../../api/catalog';
import { useCart } from '../../context/cartProvider.context';
import styles from './ProductCard.module.scss';

type ProductCardProps = {
  product: PublicCatalogProduct;
  className?: string;
  redirectToCart?: boolean;
};

export default function ProductCard({ product, className = '', redirectToCart = false }: ProductCardProps) {
  const { addItem } = useCart();
  const navigate = useNavigate();

  const hasDiscount = !!product.pricing.appliedDiscount;
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    addItem({
      productId: product.id,
      quantity: 1,
      name: product.name,
      thumbnail: product.thumbnail,
      price: product.pricing.finalGross,
    });

    if (redirectToCart) {
      navigate('/cart');
    }
  };

  return (
    <Link to={`/products/${product.id}`} className={`${styles.card} ${className}`.trim()}>
      <div className={styles.imageWrap}>
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.name} className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder}>No image</div>
        )}
      </div>

      <div className={styles.content}>
        <span className={styles.category}>{product.categoryName || 'Uncategorized'}</span>

        <h3 className={styles.name}>{product.name}</h3>

        <div className={styles.priceRow}>
          {hasDiscount ? (
            <>
              <span className={styles.oldPrice}>€{product.pricing.originalGross.toFixed(2)}</span>
              <span className={styles.price}>€{product.pricing.finalGross.toFixed(2)}</span>
            </>
          ) : (
            <span className={styles.price}>€{product.pricing.finalGross.toFixed(2)}</span>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.stock}>{isOutOfStock ? 'Out of stock' : `In stock: ${product.stock}`}</span>

          <button type="button" className={styles.cartButton} onClick={handleAddToCart} disabled={isOutOfStock}>
            Add to cart
          </button>
        </div>
      </div>
    </Link>
  );
}
