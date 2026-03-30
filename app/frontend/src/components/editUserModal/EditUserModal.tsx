import { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal } from '../dialog/Modal';
import styles from './EditUserModal.module.scss';

type Role = {
  id: number;
  name: string;
};

type UserForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  delivery_address: string;
  delivery_city: string;
  delivery_postal_code: string;
  delivery_country: string;
  role_id: number;
  customerType: 'b2b' | 'b2c';
  companyName: string;
  vat_number: string;
};

type Props = {
  user: any;
  currentUser: any;
  open: boolean;
  onClose: () => void;
  onUpdated: (user: any) => void;
};

export default function EditUserModal({ user, currentUser, open, onClose, onUpdated }: Props) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<UserForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    delivery_address: '',
    delivery_city: '',
    delivery_postal_code: '',
    delivery_country: '',
    role_id: 0,
    customerType: 'b2c',
    companyName: '',
    vat_number: '',
  });

  const isSuperAdmin = currentUser?.user?.role === 'superAdmin' || currentUser?.role === 'superAdmin';

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      postal_code: user.postal_code || '',
      country: user.country || '',
      delivery_address: user.delivery_address || '',
      delivery_city: user.delivery_city || '',
      delivery_postal_code: user.delivery_postal_code || '',
      delivery_country: user.delivery_country || '',
      role_id: Number(user.role_id) || 0,
      customerType: user.customerType || (user.company_id ? 'b2b' : 'b2c'),
      companyName: user.companyName || '',
      vat_number: user.vat_number || '',
    });
  }, [user]);

  useEffect(() => {
    if (!open || !isSuperAdmin) return;

    const fetchRoles = async () => {
      try {
        const token = currentUser?.accessToken;

        const res = await axios.get('http://localhost:8000/api/roles', {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        });

        setRoles(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch roles:', err);
      }
    };

    fetchRoles();
  }, [open, isSuperAdmin, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === 'role_id') {
        return { ...prev, role_id: Number(value) };
      }

      if (name === 'customerType') {
        return {
          ...prev,
          customerType: value as 'b2b' | 'b2c',
          companyName: value === 'b2c' ? '' : prev.companyName,
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleSubmit = async () => {
    try {
      if (form.customerType === 'b2b' && !form.companyName.trim()) {
        alert('Please enter a company name for a B2B customer.');
        return;
      }

      setIsSubmitting(true);

      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        postal_code: form.postal_code || null,
        country: form.country || null,
        delivery_address: form.delivery_address || null,
        delivery_city: form.delivery_city || null,
        delivery_postal_code: form.delivery_postal_code || null,
        delivery_country: form.delivery_country || null,
        vat_number: form.vat_number || null,
        customerType: form.customerType,
        company_name: form.customerType === 'b2b' ? form.companyName.trim() : null,
      };

      if (isSuperAdmin && form.role_id > 0) {
        payload.role_id = form.role_id;
      }

      const res = await axios.put(`http://localhost:8000/api/users/${user.id}`, payload, {
        headers: currentUser?.accessToken
          ? {
              Authorization: `Bearer ${currentUser.accessToken}`,
            }
          : undefined,
      });

      onUpdated(res.data.user);
      onClose();
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      title="Edit user"
      maxWidth="md"
      footer={
        <>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>

          <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Name</span>
          <input name="name" value={form.name} onChange={handleChange} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>Email</span>
          <input name="email" value={form.email} onChange={handleChange} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>Phone</span>
          <input name="phone" value={form.phone} onChange={handleChange} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>Address</span>
          <input name="address" value={form.address} onChange={handleChange} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>City</span>
          <input name="city" value={form.city} onChange={handleChange} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>Postal code</span>
          <input name="postal_code" value={form.postal_code} onChange={handleChange} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>Country</span>
          <input name="country" value={form.country} onChange={handleChange} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>Delivery address</span>
          <input
            name="delivery_address"
            value={form.delivery_address}
            onChange={handleChange}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span>Delivery city</span>
          <input name="delivery_city" value={form.delivery_city} onChange={handleChange} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>Delivery postal code</span>
          <input
            name="delivery_postal_code"
            value={form.delivery_postal_code}
            onChange={handleChange}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span>Delivery country</span>
          <input
            name="delivery_country"
            value={form.delivery_country}
            onChange={handleChange}
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span>Customer type</span>
          <select name="customerType" value={form.customerType} onChange={handleChange} className={styles.select}>
            <option value="b2c">B2C</option>
            <option value="b2b">B2B</option>
          </select>
        </label>

        {form.customerType === 'b2b' && (
          <>
            <label className={styles.field}>
              <span>Company name</span>
              <input
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter company name"
              />
            </label>

            <label className={styles.field}>
              <span>VAT number</span>
              <input name="vat_number" value={form.vat_number} onChange={handleChange} className={styles.input} />
            </label>
          </>
        )}

        {isSuperAdmin && (
          <label className={styles.field}>
            <span>Role</span>
            <select name="role_id" value={form.role_id} onChange={handleChange} className={styles.select}>
              <option value={0}>Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </Modal>
  );
}
