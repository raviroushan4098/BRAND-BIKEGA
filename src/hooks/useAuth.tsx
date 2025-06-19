
"use client";

import type { User } from '@/lib/authService';
import { getCurrentUser as fetchCurrentUser, loginWithEmailOtp as apiLogin, verifyOtp as apiVerifyOtp, logout as apiLogout } from '@/lib/authService';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<boolean>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = () => {
      const currentUser = fetchCurrentUser();
      setUser(currentUser);
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    // In a real app, apiLogin might be requestOtp
    const success = await apiLogin(email); // Assuming apiLogin is requestOtp
    setIsLoading(false);
    return success;
  };

  const verifyOtp = async (email: string, otp: string): Promise<boolean> => {
    setIsLoading(true);
    const verifiedUser = await apiVerifyOtp(email, otp);
    if (verifiedUser) {
      setUser(verifiedUser);
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    apiLogout();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, verifyOtp, logout }}>
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
