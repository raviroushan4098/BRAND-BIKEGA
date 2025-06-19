
"use client";

import UserSummaryCard from './UserSummaryCard';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes'; // Assuming next-themes is or will be installed
import { useEffect, useState } from 'react';

const AppHeader = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme(); // Use next-themes

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // If next-themes is not available, provide a fallback or remove theme toggle
  const toggleTheme = () => {
    if (setTheme) {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
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
          <div className="h-10 w-10" /> // Placeholder to prevent layout shift
        )}
        <div className="hidden md:block w-80"> {/* Fixed width for larger screens to avoid pushing elements */}
           <UserSummaryCard />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

// If next-themes is not used, a simple way to toggle dark mode (requires manual class management on <html>):
// const toggleTheme = () => {
//   document.documentElement.classList.toggle('dark');
// };
