
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Youtube,
  Instagram,
  Lightbulb,
  Users,
  LogOut,
  Settings,
  HelpCircle,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SidebarNav = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/youtube', label: 'YouTube Management', icon: Youtube }, // Updated label
    { href: '/instagram', label: 'Instagram Analytics', icon: Instagram },
    { href: '/suggestions', label: 'AI Suggestions', icon: Lightbulb },
  ];

  const adminNavItems = [
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/api-management', label: 'API Management', icon: KeyRound },
  ];

  return (
    <>
      <SidebarMenu className="flex-1">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                tooltip={item.label}
                aria-label={item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
        {user?.role === 'admin' && adminNavItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href || pathname.startsWith(item.href)}
                tooltip={item.label}
                aria-label={item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      
      <div className="p-2 mt-auto">
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} tooltip="Logout" aria-label="Logout" variant="outline">
                    <LogOut />
                    <span>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </>
  );
};

export default SidebarNav;
