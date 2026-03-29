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
  city: string;
  role_id: number;
  customerType: 'b2b' | 'b2c';
  companyName: string;
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
    city: '',
    role_id: 0,
    customerType: 'b2c',
    companyName: '',
  });

  const currentLoggedUserRole = currentUser?.user?.role || currentUser?.role;

  const accessToken = currentUser?.accessToken || currentUser?.user?.accessToken;

  const isSuperAdmin = currentLoggedUserRole === 'superAdmin';

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || '',
      email: user.email || '',
      city: user.city || '',
      role_id: Number(user.role_id) || 0,
      customerType: user.customerType || (user.companyName ? 'b2b' : 'b2c'),
      companyName: user.companyName || '',
    });
  }, [user]);

  useEffect(() => {
    if (!open || !isSuperAdmin) return;

    const fetchRoles = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/roles', {
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : undefined,
        });

        console.log('roles response', res.data);
        setRoles(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch roles:', err);
      }
    };

    fetchRoles();
  }, [open, isSuperAdmin, accessToken]);

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
        city: form.city,
        company_name: form.customerType === 'b2b' ? form.companyName.trim() : null,
      };

      if (isSuperAdmin && form.role_id > 0) {
        payload.role_id = form.role_id;
      }

      const res = await axios.put(`http://localhost:8000/api/users/${user.id}`, payload, {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
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
          <span>City</span>
          <input name="city" value={form.city} onChange={handleChange} className={styles.input} />
        </label>

        <label className={styles.field}>
          <span>Customer type</span>
          <select name="customerType" value={form.customerType} onChange={handleChange} className={styles.select}>
            <option value="b2c">B2C</option>
            <option value="b2b">B2B</option>
          </select>
        </label>

        {form.customerType === 'b2b' && (
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
