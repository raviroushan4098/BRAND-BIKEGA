
"use client";

import type { User } from '@/lib/authService';
import { 
  getCurrentUser as observeCurrentUser, 
  loginWithEmailPassword as apiLogin, 
  logoutService as apiLogout,
  // signUpWithEmailPassword as apiSignUp // Assuming we might need a way to create users
} from '@/lib/authService';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>; // Updated signature
  // signUp: (name: string, email: string, password: string) => Promise<boolean>; // Optional: if you want a signup flow
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); // Get current path

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = observeCurrentUser((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
      if (!currentUser && pathname !== '/login') { 
         // router.replace('/login'); // This caused issues with initial load, handled by HomePage now
      } else if (currentUser && pathname === '/login') {
        // router.replace('/dashboard'); // If logged in and on login page, redirect to dashboard
      }
    });
    return () => unsubscribe(); // Cleanup subscription
  }, [pathname, router]); // Add pathname and router to dependency array

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log(`Attempting login for email: '${email}'`); 
    // IMPORTANT: Logging passwords is a security risk. Remove this after debugging.
    console.log(`Attempting login with password: '${password}' (REMOVE THIS LOG)`); 
    setIsLoading(true);
    const loggedInUser = await apiLogin(email, password);
    if (loggedInUser) {
      setUser(loggedInUser); 
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  };

  // Example signUp function if needed
  // const signUp = async (name: string, email: string, password: string): Promise<boolean> => {
  //   setIsLoading(true);
  //   const signedUpUser = await apiSignUp(name, email, password);
  //   if (signedUpUser) {
  //     setUser(signedUpUser); // setUser will be called by onAuthStateChanged
  //     setIsLoading(false);
  //     return true;
  //   }
  //   setIsLoading(false);
  //   return false;
  // };

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

