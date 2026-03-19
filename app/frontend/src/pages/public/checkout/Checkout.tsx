import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCart } from '../../../context/cartProvider.context';
import { useCheckoutPreview } from '../../../hooks/useCheckoutPreview';
import { useCreateOrder } from '../../../hooks/useCreateOrder';
import styles from './checkout.module.scss';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');

  const previewItems = useMemo(
    () => items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    [items],
  );

  const previewQuery = useCheckoutPreview({
    items: previewItems,
    couponCode: couponCode.trim() || undefined,
    enabled: previewItems.length > 0,
  });

  const createOrderMutation = useCreateOrder();

  const handlePlaceOrder = async () => {
    if (!previewItems.length) return;

    try {
      const res = await createOrderMutation.mutateAsync({
        items: previewItems,
        couponCode: couponCode.trim() || undefined,
        billingAddress,
        shippingAddress,
        paymentMethod,
        currency: 'EUR',
      });

      clearCart();
      navigate(`/products`);
      alert(`Order created successfully. Order ID: ${res.orderId}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create order');
    }
  };

  if (!items.length) {
    return <div className={styles.empty}>Your cart is empty.</div>;
  }

  const preview = previewQuery.data;

  return (
    <div className={styles.page}>
      <div className={styles.formCard}>
        <h1>Checkout</h1>

        <div className={styles.field}>
          <label>Coupon code</label>
          <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter coupon code" />
        </div>

        <div className={styles.field}>
          <label>Billing address</label>
          <textarea value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} rows={4} />
        </div>

        <div className={styles.field}>
          <label>Shipping address</label>
          <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} rows={4} />
        </div>

        <div className={styles.field}>
          <label>Payment method</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="cash_on_delivery">Cash on delivery</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="card">Card</option>
          </select>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <h2>Order summary</h2>

        {previewQuery.isLoading ? (
          <p>Calculating...</p>
        ) : !preview ? (
          <p>Unable to calculate preview.</p>
        ) : (
          <>
            <div className={styles.lines}>
              {preview.items.map((item) => (
                <div key={item.productId} className={styles.line}>
                  <span>
                    Product #{item.productId} × {item.quantity}
                  </span>
                  <strong>€{item.total_price.toFixed(2)}</strong>
                </div>
              ))}
            </div>

            <div className={styles.totals}>
              <div className={styles.line}>
                <span>Subtotal</span>
                <strong>€{preview.subtotal.toFixed(2)}</strong>
              </div>

              {preview.coupon && (
                <div className={styles.line}>
                  <span>Coupon ({preview.coupon.code})</span>
                  <strong>-€{preview.coupon.discountAmount.toFixed(2)}</strong>
                </div>
              )}

              <div className={styles.totalLine}>
                <span>Total</span>
                <strong>€{preview.grandTotal.toFixed(2)}</strong>
              </div>
            </div>

            <button
              className={styles.placeOrderButton}
              onClick={handlePlaceOrder}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? 'Placing order...' : 'Place order'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
