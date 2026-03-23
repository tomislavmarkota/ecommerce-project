import axios from 'axios';
import { createContext, useEffect, useState } from 'react';
import { setAccessToken as setStoredAccessToken, clearAccessToken } from '../utils/tokenManager';

interface User {
  email: string;
  role: 'admin' | 'user' | 'editor' | 'superAdmin';
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  accessToken: null,
  setAccessToken: () => {},
  logout: async () => {},
  loading: true,
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setAccessToken = (token: string | null) => {
    setAccessTokenState(token);
    setStoredAccessToken(token);
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/refresh`, {
          withCredentials: true,
        });

        const newToken = res.data?.accessToken ?? null;
        const userData = res.data?.user ?? null;

        setAccessToken(newToken);
        setUser(userData);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } finally {
      clearAccessToken();
      setAccessTokenState(null);
      setUser(null);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        setAccessToken,
        logout,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };
