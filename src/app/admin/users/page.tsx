
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import UserTable from '@/components/admin/UserTable';
import CreateUserForm from '@/components/admin/CreateUserForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, RefreshCw, AlertTriangle } from 'lucide-react';
import type { User } from '@/lib/authService';
import {
  getAllUsers as apiGetAllUsers,
  adminCreateUser as apiAdminCreateUser,
  adminUpdateUser as apiAdminUpdateUser,
  adminDeleteUser as apiAdminDeleteUser
} from '@/lib/authService';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await apiGetAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      toast({ title: "Error Fetching Users", description: "Could not load user data from the server.", variant: "destructive" });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (users.find(u => u.id === userId && u.email === "davbhagalpur52@gmail.com")) {
      toast({ title: "Action Restricted", description: "The demo admin user cannot be deleted.", variant: "destructive" });
      return;
    }
    if (!window.confirm("Are you sure you want to delete this user's profile from Firestore?")) {
      return;
    }
    setIsLoading(true);
    const success = await apiAdminDeleteUser(userId);
    if (success) {
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      toast({ title: "User Profile Deleted", description: `User profile with ID ${userId} has been removed from Firestore.` });
    } else {
      toast({ title: "Error", description: "Failed to delete user profile.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleSubmitUser = async (userData: Omit<User, 'id' | 'lastLogin'>, currentUserId?: string) => {
    setIsLoading(true);
    if (currentUserId) {
      // Update user profile in Firestore
      // Ensure sensitive fields like email of specific users are not changed
      const originalUser = users.find(u => u.id === currentUserId);
      if (originalUser && originalUser.email === "davbhagalpur52@gmail.com" && userData.email !== "davbhagalpur52@gmail.com") {
          toast({ title: "Error", description: "Cannot change email of the demo admin user.", variant: "destructive" });
          setIsLoading(false);
          setIsFormOpen(false);
          return;
      }
      
      const updatePayload = { ...userData };
      // Retain original email if it's an edit action, as email is not supposed to be editable via this form.
      if (originalUser) {
        updatePayload.email = originalUser.email;
      }


      const success = await apiAdminUpdateUser(currentUserId, updatePayload);
      if (success) {
        await fetchUsers();
        toast({ title: "User Profile Updated", description: `${userData.name}'s profile details have been updated in Firestore.` });
      } else {
        toast({ title: "Error", description: "Failed to update user profile.", variant: "destructive" });
      }
    } else {
      // Create user profile in Firestore (userData includes INSECURE plaintext password)
      try {
        const newUserProfile = await apiAdminCreateUser(userData as Omit<User, 'id' | 'lastLogin'>);
        if (newUserProfile) {
          await fetchUsers();
          toast({ title: "User Profile Created (INSECURE)", description: `${newUserProfile.name}'s profile (with plaintext password) has been added to Firestore.` });
        } else {
          // apiAdminCreateUser throws an error if email exists, or returns null on other failures
          toast({ title: "Error", description: "Failed to create user profile in Firestore. The email might already exist.", variant: "destructive" });
        }
      } catch (error: any) {
         toast({ title: "Error Creating User", description: error.message || "Failed to create user profile.", variant: "destructive" });
      }
    }
    setIsLoading(false);
    setIsFormOpen(false);
  };

  return (
    <AppLayout adminOnly={true}>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold">User Profile Management</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchUsers} variant="outline" size="lg" disabled={isLoading}>
                  <RefreshCw className={`mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                <Button onClick={handleCreateUser} size="lg" disabled={isLoading}>
                  <PlusCircle className="mr-2 h-5 w-5" /> Create User Profile
                </Button>
              </div>
            </div>
            <CardDescription>
              Manage user profiles stored in Firestore.
              <br/>
              <span className="text-destructive text-xs font-semibold">WARNING:</span> User login is now direct via Firestore, storing passwords in plaintext. This is highly insecure.
            </CardDescription>
             <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-semibold">CRITICAL SECURITY RISK</AlertTitle>
                <AlertDescription>
                The authentication system has been modified to use direct Firestore login.
                This means passwords are being stored and checked in plaintext, which is extremely insecure and should never be used in production.
                Ensure all users in Firestore have a 'password' field for this system to work.
                </AlertDescription>
            </Alert>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading && users.length === 0 ? (
              <div className="text-center py-10">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading user profiles...</p>
              </div>
            ) : users.length > 0 ? (
              <UserTable users={users} onEditUser={handleEditUser} onDeleteUser={handleDeleteUser} />
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No user profiles found in Firestore.</p>
                <Button onClick={handleCreateUser} className="mt-4">
                  Create First User Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <CreateUserForm
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmitUser={handleSubmitUser}
          initialData={editingUser}
        />
      </div>
    </AppLayout>
  );
}
