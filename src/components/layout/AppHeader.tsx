
"use client";

import React, { useState, useEffect, useRef } from 'react';
import UserSummaryCard from './UserSummaryCard';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';

const AppHeader = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const closeTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (closeTimeoutIdRef.current) {
        clearTimeout(closeTimeoutIdRef.current);
      }
    };
  }, []);

  const toggleTheme = () => {
    if (setTheme) {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  const getHeaderInitials = (name: string | undefined): string => {
    if (!name) return 'U';
    const names = name.split(' ').filter(n => n.length > 0);
    if (names.length === 0) return 'U';
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  const handleTriggerMouseEnter = () => {
    if (closeTimeoutIdRef.current) {
      clearTimeout(closeTimeoutIdRef.current);
      closeTimeoutIdRef.current = null;
    }
    setPopoverOpen(true);
  };

  const handleTriggerInteractionEnd = () => { // For MouseLeave, Blur
    closeTimeoutIdRef.current = setTimeout(() => {
      setPopoverOpen(false);
    }, 150);
  };

  const handleContentMouseEnter = () => {
    if (closeTimeoutIdRef.current) {
      clearTimeout(closeTimeoutIdRef.current);
      closeTimeoutIdRef.current = null;
    }
  };

  const handleContentInteractionEnd = () => { // For MouseLeave, Blur
    closeTimeoutIdRef.current = setTimeout(() => {
      setPopoverOpen(false);
    }, 150);
  };


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        {/* Placeholder for breadcrumbs or page title if needed */}
      </div>
      <div className="flex items-center gap-4">
        {mounted && setTheme ? (
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        ) : (
          <div className="h-10 w-10" />
        )}
        <div className="hidden md:block">
          {user ? (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <div
                  onMouseEnter={handleTriggerMouseEnter}
                  onMouseLeave={handleTriggerInteractionEnd}
                  onFocus={handleTriggerMouseEnter}
                  onBlur={handleTriggerInteractionEnd}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-expanded={popoverOpen}
                  aria-label="User profile"
                >
                  <Avatar>
                    <AvatarImage 
                      src={user.name ? `https://placehold.co/40x40.png?text=${getHeaderInitials(user.name)}` : undefined} 
                      alt={user.name ? `${user.name}'s avatar` : "User Avatar"}
                      data-ai-hint="profile avatar"
                    />
                    <AvatarFallback>{getHeaderInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </div>
              </PopoverTrigger>
              <PopoverContent
                sideOffset={10}
                align="end"
                className="w-80 p-0 border-0 shadow-none" // UserSummaryCard provides its own Card styling
                onMouseEnter={handleContentMouseEnter}
                onMouseLeave={handleContentInteractionEnd}
                onFocus={handleContentMouseEnter}
                onBlur={handleContentInteractionEnd}
              >
                <UserSummaryCard />
              </PopoverContent>
            </Popover>
          ) : (
             <div className="h-10 w-10 rounded-full bg-muted" /> // Placeholder if no user
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
