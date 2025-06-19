
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
    // Attempt to load user from localStorage on initial mount
    setIsLoading(true);
    console.log("[useAuth] Checking for currentUser in localStorage (INSECURE direct Firestore login mode).");
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log("[useAuth] User loaded from localStorage:", parsedUser.email);
      } catch (e) {
        console.error("[useAuth] Error parsing user from localStorage:", e);
        localStorage.removeItem('currentUser');
        setUser(null);
      }
    } else {
      console.log("[useAuth] No currentUser found in localStorage.");
    }
    setIsLoading(false);
  }, []); // Runs once on mount

  useEffect(() => {
    // This effect handles redirection based on user state and current path
    if (!isLoading) {
      if (!user && pathname !== '/login') {
        // Redirection to /login is handled by HomePage or ProtectedRoute components
        // to avoid premature redirection before they can assess auth state.
      } else if (user && pathname === '/login') {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log(`[useAuth] Attempting login for email: '${email}' directly against Firestore (INSECURE).`);
    setIsLoading(true);
    try {
      // This now calls the direct Firestore login function from authService.ts
      const loggedInUser = await apiLogin(email, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        localStorage.setItem('currentUser', JSON.stringify(loggedInUser)); // Persist user for basic session
        console.log("[useAuth] Login successful (direct Firestore), user set:", loggedInUser.email);
        setIsLoading(false);
        router.push('/dashboard'); // Navigate after successful login
        return true;
      }
      console.log("[useAuth] Login failed (direct Firestore). apiLogin returned null.");
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error("[useAuth] Auth Hook: Error during login attempt (direct Firestore):", error);
      setIsLoading(false);
      throw error; // Re-throw for the login page to handle
    }
  };

  const logout = async () => {
    console.log("[useAuth] Logging out (direct Firestore login mode).");
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
