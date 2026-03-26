import { useContext, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCart } from '../../../context/cartProvider.context';
import { UserContext } from '../../../context/userProvider.context';
import { useCheckoutPreview } from '../../../hooks/useCheckoutPreview';
import { useCreateOrder } from '../../../hooks/useCreateOrder';
import styles from './checkout.module.scss';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCart();
  const { user, loading } = useContext(UserContext);

  const [couponCode, setCouponCode] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');

  const [guestEmail, setGuestEmail] = useState('');
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const previewItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    [items],
  );

  const previewQuery = useCheckoutPreview({
    items: previewItems,
    couponCode: couponCode.trim() || undefined,
    enabled: previewItems.length > 0,
  });

  const createOrderMutation = useCreateOrder();

  const isGuestCheckout = !loading && !user;

  const handlePlaceOrder = async () => {
    if (!previewItems.length) return;

    if (isGuestCheckout) {
      if (!guestEmail.trim() || !guestFirstName.trim() || !guestLastName.trim()) {
        alert('Please fill in guest checkout details.');
        return;
      }
    }

    if (!billingAddress.trim() || !shippingAddress.trim()) {
      alert('Please enter billing and shipping address.');
      return;
    }

    try {
      const res = await createOrderMutation.mutateAsync({
        items: previewItems,
        couponCode: couponCode.trim() || undefined,
        billingAddress: billingAddress.trim(),
        shippingAddress: shippingAddress.trim(),
        paymentMethod,
        currency: 'EUR',
        guest: isGuestCheckout
          ? {
              email: guestEmail.trim().toLowerCase(),
              firstName: guestFirstName.trim(),
              lastName: guestLastName.trim(),
              phone: guestPhone.trim() || undefined,
            }
          : undefined,
      });

      clearCart();
      alert(`Order created successfully.\nOrder ID: ${res.orderId}`);
      navigate('/products');
    } catch (error) {
      console.error(error);
      alert('Failed to create order');
    }
  };

  if (!items.length) {
    return (
      <section className={styles.emptyState}>
        <span className={styles.eyebrow}>Checkout</span>
        <h1>Your cart is empty</h1>
        <p>Add products to the cart before proceeding to checkout.</p>

        <Link to="/products" className={styles.secondaryButton}>
          Browse products
        </Link>
      </section>
    );
  }

  const preview = previewQuery.data;
  const isSubmitting = createOrderMutation.isPending;

  return (
    <section className={styles.page}>
      <div className={styles.main}>
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Checkout</span>
            <h1>Complete your order</h1>
            <p className={styles.subtitle}>Review your order details, delivery information, and payment method.</p>
          </div>

          <Link to="/cart" className={styles.secondaryButton}>
            Back to cart
          </Link>
        </div>

        {isGuestCheckout ? (
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Continue as guest</h2>
                <p>You can place the order without creating an account.</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.fieldHalf}>
                <label htmlFor="guestFirstName">First name</label>
                <input
                  id="guestFirstName"
                  type="text"
                  value={guestFirstName}
                  onChange={(e) => setGuestFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
              </div>

              <div className={styles.fieldHalf}>
                <label htmlFor="guestLastName">Last name</label>
                <input
                  id="guestLastName"
                  type="text"
                  value={guestLastName}
                  onChange={(e) => setGuestLastName(e.target.value)}
                  placeholder="Enter last name"
                />
              </div>

              <div className={styles.fieldHalf}>
                <label htmlFor="guestEmail">Email</label>
                <input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>

              <div className={styles.fieldHalf}>
                <label htmlFor="guestPhone">Phone</label>
                <input
                  id="guestPhone"
                  type="text"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div className={styles.fieldFull}>
                <p className={styles.helperText}>
                  Already have an account? <Link to="/admin/login">Sign in</Link>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Signed in customer</h2>
                <p>Your order will be connected to your account.</p>
              </div>
            </div>

            <div className={styles.accountBox}>
              <strong>{user?.email}</strong>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Order details</h2>
              <p>Apply coupon, enter addresses, and choose payment method.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.fieldFull}>
              <label htmlFor="couponCode">Coupon code</label>
              <input
                id="couponCode"
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter coupon code"
              />
            </div>

            <div className={styles.fieldFull}>
              <label htmlFor="billingAddress">Billing address</label>
              <textarea
                id="billingAddress"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                rows={4}
                placeholder="Street, city, postal code, country"
              />
            </div>

            <div className={styles.fieldFull}>
              <label htmlFor="shippingAddress">Shipping address</label>
              <textarea
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={4}
                placeholder="Street, city, postal code, country"
              />
            </div>

            <div className={styles.fieldFull}>
              <label htmlFor="paymentMethod">Payment method</label>
              <select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash_on_delivery">Cash on delivery</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Items</h2>
              <p>
                {items.length} item{items.length === 1 ? '' : 's'} in your cart.
              </p>
            </div>
          </div>

          <div className={styles.itemList}>
            {items.map((item) => (
              <div key={item.productId} className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <div className={styles.thumb}>
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name || `Product ${item.productId}`}
                        className={styles.thumbImage}
                      />
                    ) : (
                      <div className={styles.thumbPlaceholder}>No image</div>
                    )}
                  </div>

                  <div>
                    <h3>{item.name || `Product #${item.productId}`}</h3>
                    <p>
                      Quantity: <strong>{item.quantity}</strong>
                    </p>
                  </div>
                </div>

                <strong className={styles.itemPrice}>€{((item.price || 0) * item.quantity).toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className={styles.sidebar}>
        <div className={styles.summaryCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Order summary</h2>
              <p>Final preview before creating the order.</p>
            </div>
          </div>

          {previewQuery.isLoading ? (
            <div className={styles.statusBox}>Calculating order preview...</div>
          ) : !preview ? (
            <div className={styles.statusBox}>Unable to calculate preview.</div>
          ) : (
            <>
              <div className={styles.summaryLines}>
                {preview.items.map((item) => (
                  <div key={item.productId} className={styles.summaryLine}>
                    <span>
                      Product #{item.productId} × {item.quantity}
                    </span>
                    <strong>€{item.total_price.toFixed(2)}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.totals}>
                <div className={styles.summaryLine}>
                  <span>Subtotal</span>
                  <strong>€{preview.subtotal.toFixed(2)}</strong>
                </div>

                {preview.coupon && (
                  <div className={styles.summaryLine}>
                    <span>Coupon ({preview.coupon.code})</span>
                    <strong>-€{preview.coupon.discountAmount.toFixed(2)}</strong>
                  </div>
                )}

                <div className={styles.totalLine}>
                  <span>Total</span>
                  <strong>€{preview.grandTotal.toFixed(2)}</strong>
                </div>
              </div>

              <button type="button" className={styles.primaryButton} onClick={handlePlaceOrder} disabled={isSubmitting}>
                {isSubmitting ? 'Placing order...' : 'Place order'}
              </button>
            </>
          )}
        </div>
      </aside>
    </section>
  );
}
