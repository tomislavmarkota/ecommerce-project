import { useContext, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import DataTable from '../../../components/dataTable/DataTable';
import EditUserModal from '../../../components/editUserModal/EditUserModal';
import { UserContext } from '../../../context/userProvider.context';
import styles from './UserDetails.module.scss';
import { orderColumns } from './orders.columns';
import { wishlistColumns } from './wishlist.columns';
import axios from 'axios';

type Order = {
  id: number | string;
  total: number;
  paymentStatus: string;
  fulfilmentStatus: string;
  deliveryType: string;
  date: string;
};

type WishlistItem = {
  id: number | string;
  productName: string;
  category?: string;
  price: number;
  stockStatus?: string;
};

type UserType = {
  id: number;
  name: string;
  email: string;
  city?: string;
  address?: string;
  role: string;
  role_id?: number;
  created_at?: string;
  customerType: 'b2b' | 'b2c';
  company_id: number | null;
  companyName: string | null;
  orders?: Order[];
  wishlist?: WishlistItem[];
};
export default function UserDetails() {
  const { id } = useParams();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUser = useContext(UserContext);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/users/${id}`);
        setUser(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const joinedDate = useMemo(() => {
    if (!user?.created_at) return 'Recently joined';
    return new Date(user.created_at).toLocaleDateString();
  }, [user]);

  if (loading) {
    return <div className={styles.pageState}>Loading customer...</div>;
  }

  if (!user) {
    return <div className={styles.pageState}>User not found</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>E-commerce / Customers</p>
          <h1 className={styles.pageTitle}>Customer details</h1>
        </div>

        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setOpen(true)}>
          Edit customer
        </button>
      </div>

      <section className={styles.infoCard}>
        <div className={styles.infoLeft}>
          <div className={styles.avatar}>{user.name?.slice(0, 1).toUpperCase() || 'U'}</div>

          <div>
            <h2 className={styles.customerName}>{user.name}</h2>
            <p className={styles.joinedText}>{joinedDate}</p>

            <div className={styles.roleRow}>
              <span className={`${styles.badge} ${styles[user.role.toLowerCase()] || styles.defaultBadge}`}>
                {user.role}
              </span>

              <span className={`${styles.badge} ${styles[user.customerType.toLowerCase()] || styles.defaultBadge}`}>
                {user.customerType.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.infoRight}>
          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Address</span>
            <strong>{user.address || user.city || 'No address provided'}</strong>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Email</span>
            <strong>{user.email}</strong>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Role</span>
            <strong>{user.role}</strong>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Customer type</span>
            <strong>{user.customerType.toUpperCase()}</strong>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Company</span>
            <strong>{user.companyName || '—'}</strong>
          </div>
        </div>
      </section>

      <DataTable
        title="Orders"
        subtitle={`${user.orders?.length ?? 0} total orders`}
        data={user.orders ?? []}
        columns={orderColumns}
        isLoading={false}
        emptyMessage="No orders found"
        showToolbar={false}
        showFooter={false}
      />

      <div className={styles.sectionSpacing} />

      <DataTable
        title="Wishlist"
        subtitle={`${user.wishlist?.length ?? 0} wishlist items`}
        data={user.wishlist ?? []}
        columns={wishlistColumns}
        isLoading={false}
        emptyMessage="No wishlist items found"
        showToolbar={false}
        showFooter={false}
      />

      {open && (
        <EditUserModal
          open={open}
          currentUser={currentUser}
          user={user}
          onClose={() => setOpen(false)}
          onUpdated={(updatedUser) => setUser(updatedUser)}
        />
      )}
    </div>
  );
}
