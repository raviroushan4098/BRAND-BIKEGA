
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { BotMessageSquare, Mail, KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !isLoading) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const success = await login(email, password);
      if (success) {
        toast({ title: 'Login Successful', description: 'Welcome back!' });
        // Navigation is handled by useAuth or useEffect above
      } else {
        toast({
          title: 'Login Failed',
          description: 'Invalid email or password. Please check your credentials. This app uses a direct Firestore login (INSECURE).',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error("Login page error:", error);
      let description = 'An unexpected error occurred during login. This app uses a direct Firestore login (INSECURE).';
      if (error && error.message && error.message.includes('Email already exists')) {
        description = 'This email is already registered. Please try logging in or use a different email.';
      } else if (error && error.message) {
        description = `Error: ${error.message}`;
      }
      toast({ title: 'Login Failed', description, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  if (isLoading || (user && !isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary text-primary-foreground rounded-full inline-block">
            <BotMessageSquare className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-bold">Insight Stream</CardTitle>
          <CardDescription>
            Access your social media analytics.
            <br />
            <span className="text-destructive text-xs font-semibold">
              WARNING: This app uses an insecure direct Firestore login method.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center">
                <Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-base"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center">
                <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" /> Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-base pr-10"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting || isLoading}>
              {isSubmitting ? 'Logging In...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Insight Stream. All rights reserved.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
