
"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import UserTable from '@/components/admin/UserTable';
import CreateUserForm from '@/components/admin/CreateUserForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users } from 'lucide-react';
import type { User } from '@/lib/authService';
import { getAllUsers as apiGetAllUsers, createUser as apiCreateUser } from '@/lib/authService'; // Mock API calls
import { toast } from '@/hooks/use-toast';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    // Fetch users (mocked)
    const fetchedUsers = apiGetAllUsers();
    setUsers(fetchedUsers);
  }, []);

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    // Mock delete: filter out user
    setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    toast({ title: "User Deleted", description: `User with ID ${userId} has been removed (mock).` });
  };

  const handleSubmitUser = (userData: Omit<User, 'id' | 'lastLogin'>, currentUserId?: string) => {
    if (currentUserId) {
      // Mock edit: update user in list
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === currentUserId ? { ...user, ...userData, id: currentUserId, lastLogin: user.lastLogin } : user
        )
      );
      toast({ title: "User Updated", description: `${userData.name}'s details have been updated (mock).` });
    } else {
      // Mock create: add new user to list
      const newUser = apiCreateUser(userData); // This mock function adds to an in-memory MOCK_USERS array and returns the new user
      setUsers(prevUsers => [...prevUsers, newUser]); // Reflect in local state
      toast({ title: "User Created", description: `${newUser.name} has been added successfully (mock).` });
    }
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
              <Button onClick={handleCreateUser} size="lg">
                <PlusCircle className="mr-2 h-5 w-5" /> Create User
              </Button>
            </div>
            <CardDescription>
              Manage user roles, permissions, and tracked social media channels.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {users.length > 0 ? (
              <UserTable users={users} onEditUser={handleEditUser} onDeleteUser={handleDeleteUser} />
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No users found.</p>
                <Button onClick={handleCreateUser} className="mt-4">
                  Create Your First User
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
