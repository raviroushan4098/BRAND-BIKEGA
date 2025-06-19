
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { BotMessageSquare, Mail, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, verifyOtp, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const success = await login(email); // `login` here is actually `requestOtp`
      if (success) {
        setOtpSent(true);
        toast({ title: 'OTP Sent', description: 'Check your email for the OTP (use 123456 for demo).' });
      } else {
        toast({ title: 'Error', description: 'Failed to send OTP. Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const success = await verifyOtp(email, otp);
      if (success) {
        toast({ title: 'Login Successful', description: 'Welcome back!' });
        router.push('/dashboard');
      } else {
        toast({ title: 'Invalid OTP', description: 'The OTP entered is incorrect. Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };
  
  if (isLoading || user) { // Added user check to prevent brief flash of login form
    return <div className="flex items-center justify-center min-h-screen bg-background"><p>Loading...</p></div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary text-primary-foreground rounded-full inline-block">
            <BotMessageSquare className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-bold">Insight Stream</CardTitle>
          <CardDescription>Securely access your social media analytics.</CardDescription>
        </CardHeader>
        <CardContent>
          {!otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-6">
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
                />
              </div>
              <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
                {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp" className="flex items-center">
                  <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" /> One-Time Password
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP (e.g., 123456)"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="text-base tracking-widest text-center"
                />
              </div>
              <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Verify OTP & Login'}
              </Button>
              <Button variant="link" onClick={() => setOtpSent(false)} className="w-full">
                Request OTP again?
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Insight Stream. All rights reserved.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
