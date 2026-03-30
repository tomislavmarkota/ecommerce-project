import { useContext, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { PaginationState, SortingState } from '@tanstack/react-table';
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
  role?: string;
  role_id?: number;
  created_at?: string;
  customerType?: 'b2b' | 'b2c';
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

  const [ordersSorting, setOrdersSorting] = useState<SortingState>([]);
  const [wishlistSorting, setWishlistSorting] = useState<SortingState>([]);

  const [ordersPagination, setOrdersPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [wishlistPagination, setWishlistPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

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

  const roleKey = String(user.role ?? '').toLowerCase();
  const customerTypeKey = String(user.customerType ?? '').toLowerCase();

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
            <h2 className={styles.customerName}>{user.name || 'Unknown user'}</h2>
            <p className={styles.joinedText}>{joinedDate}</p>

            <div className={styles.roleRow}>
              <span className={`${styles.badge} ${styles[roleKey] || styles.defaultBadge}`}>
                {user.role || 'Unknown'}
              </span>

              <span className={`${styles.badge} ${styles[customerTypeKey] || styles.defaultBadge}`}>
                {(user.customerType || 'Unknown').toUpperCase()}
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
            <strong>{user.email || 'No email provided'}</strong>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Role</span>
            <strong>{user.role || 'Unknown'}</strong>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Customer type</span>
            <strong>{(user.customerType || 'Unknown').toUpperCase()}</strong>
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
        sorting={ordersSorting}
        onSortingChange={setOrdersSorting}
        pagination={ordersPagination}
        onPaginationChange={setOrdersPagination}
        pageCount={1}
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
        sorting={wishlistSorting}
        onSortingChange={setWishlistSorting}
        pagination={wishlistPagination}
        onPaginationChange={setWishlistPagination}
        pageCount={1}
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
