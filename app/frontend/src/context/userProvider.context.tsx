// UserContext.tsx
import axios from 'axios';
import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

interface User {
  email: string;
  role: 'admin' | 'user' | 'editor';
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Automatically attach the in-memory access token to all requests
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (accessToken) {
          config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, [accessToken]);

  // useEffect(() => {
  //   const tryRefresh = async () => {
  //     const res = await fetch(`${API_URL}/api/auth/refresh`, { credentials: 'include' });
  //     if (res.ok) {
  //       const data = await res.json();
  //       setAccessToken(data.accessToken);
  //       setUser(data.user);
  //       console.log('data from tryRefresh', data);
  //     }
  //   };
  //   tryRefresh();
  // }, []);
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await api.get('/auth/refresh', { withCredentials: true });
        if (res.data?.user) {
          setUser(res.data.user);
          setAccessToken(res.data.accessToken);
        }
      } catch (err) {
        console.warn('No active session');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);
  console.log('user', user);
  console.log('accessToken', accessToken);
  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout, accessToken, setAccessToken, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };
