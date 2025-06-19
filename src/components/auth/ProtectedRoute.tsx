
"use client";

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (adminOnly && user.role !== 'admin') {
        router.replace('/dashboard'); // Or an unauthorized page
      }
    }
  }, [user, isLoading, router, adminOnly]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-8 w-1/3 mb-2" />
        <Skeleton className="h-8 w-1/3" />
      </div>
    );
  }

  if (!user || (adminOnly && user.role !== 'admin')) {
    // Still loading or redirecting
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
