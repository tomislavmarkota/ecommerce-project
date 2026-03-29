import { Outlet, Link } from 'react-router';
import { useCart } from '../../../context/cartProvider.context';
import styles from './PublicLayout.module.scss';
import logo from '../../../assets/logo.jfif';

export default function PublicLayout() {
  const { totalItems } = useCart();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo} aria-label="Mirbar home">
            <img src={logo} alt="Mirbar logo" className={styles.logoImage} />
          </Link>

          <nav className={styles.nav}>
            <Link to="/" className={styles.navLink}>
              Home
            </Link>
            <Link to="/products" className={styles.navLink}>
              Products
            </Link>
            <Link to="/cart" className={styles.navLink}>
              Cart ({totalItems})
            </Link>
            <Link to="/login" className={styles.navLink}>
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
