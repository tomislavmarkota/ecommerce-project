import { useContext, useState } from 'react';
import { useNavigate } from 'react-router';
import { UserContext } from '../../../context/userProvider.context';
import { login } from '../../../api/auth';
import styles from './Login.module.scss';

const Login = () => {
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
      setError(err?.response?.data?.message || err?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.subtitle}>Get access to your account</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email"
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
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className={styles.footer}>
          <span>New here?</span>
          <button type="button" className={styles.linkButton}>
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
