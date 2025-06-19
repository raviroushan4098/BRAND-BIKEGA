
"use client";

import type { User } from '@/lib/authService';
import {
  loginWithEmailPassword as apiLogin,
  logoutService as apiLogout,
  // getCurrentUser is not used in the same way, effect handles local storage
} from '@/lib/authService';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsLoading(true);
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('currentUser');
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []); // Runs once on mount

  useEffect(() => {
    // This effect handles redirection based on user state and current path
    if (!isLoading) {
      if (!user && pathname !== '/login') {
        // router.replace('/login'); // Handled by HomePage or ProtectedRoute
      } else if (user && pathname === '/login') {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log(`Attempting login for email: '${email}' directly against Firestore (INSECURE).`);
    setIsLoading(true);
    try {
      const loggedInUser = await apiLogin(email, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        setIsLoading(false);
        router.push('/dashboard'); // Navigate after successful login
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error("Auth Hook: Error during login attempt:", error);
      setIsLoading(false);
      throw error; // Re-throw for the login page to handle
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await apiLogout(); // Clears localStorage
    setUser(null);
    router.push('/login');
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
