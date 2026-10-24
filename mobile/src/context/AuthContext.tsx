import React, { createContext, useContext, useEffect, useState } from 'react';
import * as storage from '../utils/storage';
import { setAuthToken, setOnUnauthorized } from '../api/client';

export interface User {
  id: string;
  phone: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

const TOKEN_KEY = 'miniledger_token';
const USER_KEY = 'miniledger_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore persisted session from storage on app launch
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await storage.getItem(TOKEN_KEY);
        const storedUser = await storage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setAuthToken(storedToken);
        }
      } catch (err) {
        console.error('Failed to restore session from storage:', err);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  // Connect 401 unauthorized interceptor to logout
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
  }, []);

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setAuthToken(newToken);

    try {
      await storage.setItem(TOKEN_KEY, newToken);
      await storage.setItem(USER_KEY, JSON.stringify(newUser));
    } catch (err) {
      console.error('Failed to persist credentials:', err);
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);

    try {
      await storage.deleteItem(TOKEN_KEY);
      await storage.deleteItem(USER_KEY);
    } catch (err) {
      console.error('Failed to clear credentials:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
