import { use, useEffect, useState } from 'react';
import axios from 'axios';
import { Modal } from '../dialog/Modal';
import { UserContext } from '../../context/userProvider.context';

type Props = {
  user: any;
  currentUser: any;
  open: boolean;
  onClose: () => void;
  onUpdated: (user: any) => void;
};

export default function EditUserModal({ user, currentUser, open, onClose, onUpdated }: Props) {
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    city: '',
    role_id: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: name === 'role_id' ? Number(value) : value,
    });
  };
  const handleSubmit = async () => {
    try {
      const res = await axios.put(`http://localhost:8000/api/users/${user.id}`, form, {
        headers: {
          Authorization: `Bearer ${currentUser.accessToken}`,
        },
      });

      onUpdated(res.data.user);

      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser.user.role !== 'superAdmin') return;

    const fetchRoles = async () => {
      const res = await axios.get('http://localhost:8000/api/roles', {
        headers: {
          Authorization: `Bearer ${currentUser.accessToken}`,
        },
      });
      setRoles(res.data);
    };

    fetchRoles();
  }, [currentUser]);

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || '',
      email: user.email || '',
      city: user.city || '',
      role_id: user.role_id || 0,
    });
  }, [user]);

  console.log('currentUser', currentUser);
  console.log(user);
  return (
    <Modal
      open={open}
      title="Edit user"
      onSubmit={handleSubmit}
      onClose={onClose}
      submitLabel="Save"
      cancelLabel="Cancel"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" style={inputStyle} />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" style={inputStyle} />
        <input name="city" value={form.city} onChange={handleChange} placeholder="City" style={inputStyle} />
        {currentUser.user.role === 'superAdmin' && (
          <select name="role_id" value={form.role_id} onChange={handleChange} style={inputStyle}>
            {roles.map((role: any) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </Modal>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: '7px',
  border: '1px solid #d1d5db',
  fontSize: '0.95rem',
  width: '100%',
  boxSizing: 'border-box',
};
