
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import UserTable from '@/components/admin/UserTable';
import CreateUserForm from '@/components/admin/CreateUserForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, RefreshCw } from 'lucide-react';
import type { User } from '@/lib/authService';
import { 
  getAllUsers as apiGetAllUsers, 
  adminCreateUser as apiAdminCreateUser, 
  adminUpdateUser as apiAdminUpdateUser,
  adminDeleteUser as apiAdminDeleteUser
} from '@/lib/authService';
import { toast } from '@/hooks/use-toast';

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
    if (!window.confirm("Are you sure you want to delete this user's profile? This action might not delete their authentication record.")) {
      return;
    }
    setIsLoading(true);
    const success = await apiAdminDeleteUser(userId);
    if (success) {
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      toast({ title: "User Profile Deleted", description: `User profile with ID ${userId} has been removed from Firestore. Auth record may persist.` });
    } else {
      toast({ title: "Error", description: "Failed to delete user profile.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  // The Omit type might need adjustment if 'password' is part of UserFormValues in CreateUserForm but not User
  const handleSubmitUser = async (userData: Omit<User, 'id' | 'lastLogin'> & { password?: string }, currentUserId?: string) => {
    setIsLoading(true);
    if (currentUserId) {
      // Update user
      const { password, ...updateData } = userData; // Exclude password from update data
      const success = await apiAdminUpdateUser(currentUserId, updateData);
      if (success) {
        await fetchUsers(); // Re-fetch to get updated list
        toast({ title: "User Updated", description: `${userData.name}'s details have been updated.` });
      } else {
        toast({ title: "Error", description: "Failed to update user.", variant: "destructive" });
      }
    } else {
      // Create user (userData includes password if provided by form)
      if (!userData.password) {
         toast({ title: "Error", description: "Password is required for new user creation.", variant: "destructive" });
         setIsLoading(false);
         return;
      }
      const newUser = await apiAdminCreateUser(userData as Omit<User, 'id' | 'lastLogin'> & {password: string});
      if (newUser) {
        await fetchUsers(); // Re-fetch to include new user
        toast({ title: "User Profile Created", description: `${newUser.name} has been added to Firestore. Ensure their auth account is also set up.` });
      } else {
        toast({ title: "Error", description: "Failed to create user profile.", variant: "destructive" });
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
                <CardTitle className="text-3xl font-bold">User Management</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchUsers} variant="outline" size="lg" disabled={isLoading}>
                  <RefreshCw className={`mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                <Button onClick={handleCreateUser} size="lg" disabled={isLoading}>
                  <PlusCircle className="mr-2 h-5 w-5" /> Create User
                </Button>
              </div>
            </div>
            <CardDescription>
              Manage user roles, permissions, and tracked social media channels. User profiles are stored in Firestore.
              <br/>
              <span className="text-destructive text-xs">Note: User authentication records (login credentials) are managed separately in Firebase Authentication. Deleting a user here removes their profile data, not their login.</span>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading && users.length === 0 ? (
              <div className="text-center py-10">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : users.length > 0 ? (
              <UserTable users={users} onEditUser={handleEditUser} onDeleteUser={handleDeleteUser} />
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No users found.</p>
                <Button onClick={handleCreateUser} className="mt-4">
                  Create Your First User Profile
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
