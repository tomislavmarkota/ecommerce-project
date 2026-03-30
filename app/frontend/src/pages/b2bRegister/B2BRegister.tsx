import { useState } from 'react';
import { useNavigate } from 'react-router';
import styles from './B2BRegister.module.scss';
import { registerB2B } from '../../api/auth';

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  companyName: string;
  vatNumber: string;
};

const initialForm: RegisterForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
  deliveryAddress: '',
  deliveryCity: '',
  deliveryPostalCode: '',
  deliveryCountry: '',
  companyName: '',
  vatNumber: '',
};

export default function B2BRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!form.password) return 'Password is required.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (!form.companyName.trim()) return 'Company name is required for B2B registration.';
    if (!form.vatNumber.trim()) return 'VAT number is required for B2B registration.';
    if (!form.city.trim()) return 'City is required.';
    if (!form.country.trim()) return 'Country is required.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        postal_code: form.postalCode.trim() || null,
        country: form.country.trim() || null,
        delivery_address: form.deliveryAddress.trim() || null,
        delivery_city: form.deliveryCity.trim() || null,
        delivery_postal_code: form.deliveryPostalCode.trim() || null,
        delivery_country: form.deliveryCountry.trim() || null,
        company_name: form.companyName.trim(),
        vat_number: form.vatNumber.trim(),
      };

      await registerB2B(payload);

      setSuccessMessage('Your business account request has been submitted successfully.');
      setForm(initialForm);

      setTimeout(() => {
        navigate('/b2b-login');
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'B2B registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.badge}>B2B Portal</div>
          <h1 className={styles.title}>Create a business account</h1>
          <p className={styles.subtitle}>Register your company account to access business pricing and B2B ordering.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Business email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter your business email"
                required
              />
            </div>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className={styles.input}
                placeholder="Create a password"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                className={styles.input}
                placeholder="Repeat your password"
                required
              />
            </div>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="companyName" className={styles.label}>
                Company name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                value={form.companyName}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter company name"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="vatNumber" className={styles.label}>
                VAT number
              </label>
              <input
                id="vatNumber"
                name="vatNumber"
                type="text"
                value={form.vatNumber}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter VAT number"
                required
              />
            </div>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="phone" className={styles.label}>
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={form.phone}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter phone number"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="country" className={styles.label}>
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                value={form.country}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter country"
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="address" className={styles.label}>
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={form.address}
              onChange={handleChange}
              className={styles.input}
              placeholder="Street and house number"
            />
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="city" className={styles.label}>
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter city"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="postalCode" className={styles.label}>
                Postal code
              </label>
              <input
                id="postalCode"
                name="postalCode"
                type="text"
                value={form.postalCode}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter postal code"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="deliveryAddress" className={styles.label}>
              Delivery address
            </label>
            <input
              id="deliveryAddress"
              name="deliveryAddress"
              type="text"
              value={form.deliveryAddress}
              onChange={handleChange}
              className={styles.input}
              placeholder="Delivery street and house number"
            />
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label htmlFor="deliveryCity" className={styles.label}>
                Delivery city
              </label>
              <input
                id="deliveryCity"
                name="deliveryCity"
                type="text"
                value={form.deliveryCity}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter delivery city"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="deliveryPostalCode" className={styles.label}>
                Delivery postal code
              </label>
              <input
                id="deliveryPostalCode"
                name="deliveryPostalCode"
                type="text"
                value={form.deliveryPostalCode}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter delivery postal code"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="deliveryCountry" className={styles.label}>
              Delivery country
            </label>
            <input
              id="deliveryCountry"
              name="deliveryCountry"
              type="text"
              value={form.deliveryCountry}
              onChange={handleChange}
              className={styles.input}
              placeholder="Enter delivery country"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {successMessage && <div className={styles.success}>{successMessage}</div>}

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Create B2B account'}
          </button>
        </form>

        <div className={styles.footer}>
          <span>Already have a business account?</span>
          <button type="button" className={styles.linkButton} onClick={() => navigate('/b2b-login')}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
