// Login.tsx
import { use } from 'react';
import { UserContext } from '../../../context/userProvider.context';
import { useNavigate } from 'react-router';
import { login } from '../../../api/auth';

const Login = () => {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = use(UserContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (e.target as any).email.value;
    const password = (e.target as any).password.value;

    try {
      const res = await login(email, password);
      const { user, accessToken } = res.data;

      setUser(user);
      setAccessToken(accessToken); // in-memory only

      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required placeholder="Email" />
      <input name="password" type="password" required placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
