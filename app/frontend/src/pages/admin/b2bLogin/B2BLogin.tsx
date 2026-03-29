import { useContext, useState } from 'react';
import { useNavigate } from 'react-router';
import { UserContext } from '../../../context/userProvider.context';
import { login } from '../../../api/auth';
import styles from './B2BLogin.module.scss';

const B2BLogin = () => {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useContext(UserContext);

  const [form, setForm] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    try {
      setIsSubmitting(true);

      const res = await login(form.email, form.password);
      const { user, accessToken } = res.data;

      setUser(user);
      setAccessToken(accessToken);

      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'B2B login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.badge}>B2B Portal</div>
          <h1 className={styles.title}>Business sign in</h1>
          <p className={styles.subtitle}>Access your business account, company pricing, and order history.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Business email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your business email"
              value={form.email}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.metaRow}>
            <label className={styles.checkboxLabel}>
              <input name="rememberMe" type="checkbox" checked={form.rememberMe} onChange={handleChange} />
              <span>Remember me</span>
            </label>

            <button type="button" className={styles.linkButton}>
              Forgot password?
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in to B2B portal'}
          </button>
        </form>

        <div className={styles.infoBox}>
          <h2 className={styles.infoTitle}>Business account benefits</h2>
          <ul className={styles.infoList}>
            <li>Company-specific pricing</li>
            <li>Business order history</li>
            <li>Faster repeat purchasing</li>
            <li>Access to B2B offers</li>
          </ul>
        </div>

        <div className={styles.footer}>
          <span>Need a business account?</span>
          <button type="button" className={styles.linkButton} onClick={() => navigate('/b2b-register')}>
            Contact sales / Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default B2BLogin;
