
"use client";

import type { User } from '@/lib/authService';
import { 
  getCurrentUser as observeCurrentUser, 
  loginWithEmailPassword as apiLogin, 
  logoutService as apiLogout,
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
    const unsubscribe = observeCurrentUser((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
      if (!currentUser && pathname !== '/login') { 
         // router.replace('/login'); // Handled by HomePage
      } else if (currentUser && pathname === '/login') {
        router.replace('/dashboard'); 
      }
    });
    return () => unsubscribe(); 
  }, [pathname, router]); 

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log(`Attempting login for email: '${email}'`);
    // IMPORTANT: Do not log passwords in production. This was for temporary debugging.
    // console.log(`Attempting login with password: '${password}'`); 
    setIsLoading(true);
    try {
      const loggedInUser = await apiLogin(email, password);
      if (loggedInUser) {
        setUser(loggedInUser); 
        setIsLoading(false);
        return true;
      }
      // This case might occur if apiLogin returns null without throwing an error (e.g. unexpected issue)
      setIsLoading(false);
      return false;
    } catch (error) {
      // This catch block handles errors thrown by apiLogin, such as 'auth/invalid-credential'
      console.error("Auth Hook: Error during login attempt:", error);
      setIsLoading(false);
      return false; 
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await apiLogout();
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
