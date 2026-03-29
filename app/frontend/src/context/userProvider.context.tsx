import { createContext, useEffect, useState } from 'react';
import api from '../api/axios';
import { setAccessToken as setStoredAccessToken, clearAccessToken } from '../utils/tokenManager';
import { refreshSession } from '../utils/refreshManager';

interface User {
  id?: number;
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

const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setAccessToken = (token: string | null) => {
    setAccessTokenState(token);
    setStoredAccessToken(token);
  };

  const setUser = (nextUser: User | null) => {
    setUserState(nextUser);
  };

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const data = await refreshSession();

        if (!isMounted) return;

        const newToken = data?.accessToken ?? null;
        const userData = data?.user ?? null;

        setAccessToken(newToken);
        setUser(userData);
      } catch (error) {
        if (!isMounted) return;

        console.error('Session restore failed:', error);
        setAccessToken(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAccessToken();
      setAccessTokenState(null);
      setUserState(null);
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
