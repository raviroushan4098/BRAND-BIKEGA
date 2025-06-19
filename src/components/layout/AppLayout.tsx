
"use client";

import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import SidebarNav from './SidebarNav';
import AppHeader from './AppHeader';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { BotMessageSquare } from 'lucide-react'; // Icon for app name
import { ThemeProvider } from 'next-themes'; // For theme toggling

interface AppLayoutProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, adminOnly = false }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ProtectedRoute adminOnly={adminOnly}>
        <SidebarProvider defaultOpen>
          <Sidebar Rail={<SidebarRail />} collapsible="icon">
            <SidebarHeader className="p-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-xl font-semibold text-sidebar-primary">
                <BotMessageSquare className="h-7 w-7" />
                <span className="group-data-[collapsible=icon]:hidden">Insight Stream</span>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              <ScrollArea className="h-full">
                <SidebarNav />
              </ScrollArea>
            </SidebarContent>
            <SidebarFooter>
              {/* Optional: Footer content in sidebar */}
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <AppHeader />
            <main className="flex-1 p-4 sm:p-6 overflow-auto">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    </ThemeProvider>
  );
};

export default AppLayout;
