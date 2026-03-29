import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import styles from './orderDetails.module.scss';
import { fetchOrderById } from '../../../api/order';

type OrderItem = {
  id?: number;
  product_id: number;
  quantity: number;
  original_unit_price: number;
  unit_price: number;
  discount_amount: number;
  total_price: number;
  applied_discount_name?: string | null;
};

type OrderDetails = {
  id: number;
  status: string;
  currency: string;
  payment_method: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  coupon_code?: string | null;
  customer_group_code?: string | null;
  user_id?: number | null;
  guest_email?: string | null;
  guest_first_name?: string | null;
  guest_last_name?: string | null;
  guest_phone?: string | null;
  items: OrderItem[];
};

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      if (!id || Number.isNaN(Number(id))) {
        setMessage('Invalid order id');
        setLoading(false);
        return;
      }

      try {
        const data = await fetchOrderById(Number(id));
        setOrder(data);
      } catch (error: any) {
        console.error(error);
        setMessage(error?.response?.data?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    void loadOrder();
  }, [id]);

  if (loading) {
    return <div className={styles.pageState}>Loading order...</div>;
  }

  if (!order) {
    return <div className={styles.pageState}>{message || 'Order not found'}</div>;
  }

  const customerName =
    [order.guest_first_name, order.guest_last_name].filter(Boolean).join(' ') || 'Registered customer';

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>E-commerce / Orders</p>
          <h1 className={styles.pageTitle}>Order #{order.id}</h1>
          <p className={styles.pageSubtitle}>Created: {new Date(order.created_at).toLocaleString()}</p>
        </div>

        <button type="button" className={styles.backButton} onClick={() => navigate('/orders')}>
          Back
        </button>
      </div>

      <div className={styles.topGrid}>
        <section className={styles.card}>
          <h3>Order overview</h3>
          <div className={styles.metaGrid}>
            <div>
              <span>Status</span>
              <strong>{order.status}</strong>
            </div>
            <div>
              <span>Currency</span>
              <strong>{order.currency}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>{order.payment_method || '-'}</strong>
            </div>
            <div>
              <span>Coupon</span>
              <strong>{order.coupon_code || '-'}</strong>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h3>Customer</h3>
          <div className={styles.metaGrid}>
            <div>
              <span>Name</span>
              <strong>{customerName}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{order.guest_email || '-'}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{order.guest_phone || '-'}</strong>
            </div>
            <div>
              <span>User ID</span>
              <strong>{order.user_id ?? '-'}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.mainGrid}>
        <section className={styles.card}>
          <h3>Items</h3>

          <div className={styles.itemsTableWrap}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Qty</th>
                  <th>Original</th>
                  <th>Unit</th>
                  <th>Discount</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={item.id ?? `${item.product_id}-${index}`}>
                    <td>{item.product_id}</td>
                    <td>{item.quantity}</td>
                    <td>{item.original_unit_price.toFixed(2)}</td>
                    <td>{item.unit_price.toFixed(2)}</td>
                    <td>{item.discount_amount.toFixed(2)}</td>
                    <td>{item.total_price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className={styles.sideStack}>
          <section className={styles.card}>
            <h3>Addresses</h3>
            <div className={styles.addressBlock}>
              <span>Billing</span>
              <p>{order.billing_address || '-'}</p>
            </div>
            <div className={styles.addressBlock}>
              <span>Shipping</span>
              <p>{order.shipping_address || '-'}</p>
            </div>
          </section>

          <section className={styles.card}>
            <h3>Totals</h3>
            <div className={styles.totals}>
              <div>
                <span>Subtotal</span>
                <strong>{order.subtotal.toFixed(2)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>{order.discount_total.toFixed(2)}</strong>
              </div>
              <div>
                <span>Shipping</span>
                <strong>{order.shipping_total.toFixed(2)}</strong>
              </div>
              <div>
                <span>Tax</span>
                <strong>{order.tax_total.toFixed(2)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Total</span>
                <strong>{order.grand_total.toFixed(2)}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
