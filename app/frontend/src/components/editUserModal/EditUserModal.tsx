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
  });

  const isSuperAdmin = currentUser?.user?.role === 'superAdmin';

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || '',
      email: user.email || '',
      city: user.city || '',
      role_id: user.role_id || 0,
    });
  }, [user]);

  useEffect(() => {
    if (!open || !isSuperAdmin) return;

    const fetchRoles = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/roles', {
          headers: {
            Authorization: `Bearer ${currentUser.accessToken}`,
          },
        });

        setRoles(res.data ?? []);
      } catch (err) {
        console.error('Failed to fetch roles:', err);
      }
    };

    fetchRoles();
  }, [open, isSuperAdmin, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === 'role_id' ? Number(value) : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const res = await axios.put(`http://localhost:8000/api/users/${user.id}`, form, {
        headers: {
          Authorization: `Bearer ${currentUser.accessToken}`,
        },
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
      onClose={isSubmitting ? () => {} : onClose}
      title="Edit user"
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="button"
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="edit-user-name">
            Name
          </label>
          <input
            id="edit-user-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Name"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="edit-user-email">
            Email
          </label>
          <input
            id="edit-user-email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="edit-user-city">
            City
          </label>
          <input
            id="edit-user-city"
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="City"
            className={styles.input}
          />
        </div>

        {isSuperAdmin && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-user-role">
              Role
            </label>
            <select
              id="edit-user-role"
              name="role_id"
              value={form.role_id}
              onChange={handleChange}
              className={styles.input}
            >
              <option value={0} disabled>
                Select role
              </option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
}
