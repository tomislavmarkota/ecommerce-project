import { Link, useNavigate } from 'react-router';
import { useCart } from '../../../context/cartProvider.context';
import styles from './cart.module.scss';

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart } = useCart();

  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  if (!items.length) {
    return (
      <div className={styles.empty}>
        <h1>Your cart is empty</h1>
        <Link to="/products" className={styles.linkButton}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Cart</h1>
        <button onClick={clearCart} className={styles.clearButton}>
          Clear cart
        </button>
      </div>

      <div className={styles.list}>
        {items.map((item) => (
          <div key={item.productId} className={styles.item}>
            <div className={styles.itemInfo}>
              <div className={styles.thumb}>
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.name} className={styles.thumbImage} />
                ) : (
                  <div className={styles.thumbPlaceholder}>No image</div>
                )}
              </div>

              <div>
                <h3>{item.name || `Product #${item.productId}`}</h3>
                <p>€{(item.price || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className={styles.itemActions}>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateQuantity(item.productId, Math.max(1, Number(e.target.value) || 1))}
                className={styles.qtyInput}
              />

              <button onClick={() => removeItem(item.productId)} className={styles.removeButton}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.summary}>
        <div>
          <span>Estimated subtotal</span>
          <strong>€{subtotal.toFixed(2)}</strong>
        </div>

        <button onClick={() => navigate('/checkout')} className={styles.checkoutButton}>
          Proceed to checkout
        </button>
      </div>
    </div>
  );
}
