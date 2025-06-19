
"use client";

import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User } from '@/lib/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from 'lucide-react';

const userFormSchemaBase = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  role: z.enum(['user', 'admin']),
});

const createUserSchema = userFormSchemaBase.extend({
  password: z.string().min(6, "Password (for admin reference) must be at least 6 characters."),
});

const editUserSchema = userFormSchemaBase.extend({
  password: z.string().optional(), // Password is not editable for existing users via this form in terms of Auth.
});

type UserFormValues = z.infer<typeof createUserSchema> | z.infer<typeof editUserSchema>;

interface CreateUserFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitUser: (data: Omit<User, 'id' | 'lastLogin'> & { password?: string }, currentUserId?: string) => void;
  initialData?: User | null;
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({ isOpen, onOpenChange, onSubmitUser, initialData }) => {
  const isEditing = !!initialData;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(isEditing ? editUserSchema : createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'user',
      password: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          name: initialData.name,
          email: initialData.email,
          role: initialData.role,
          password: '', // Password field is cleared for edits, as it's reference for manual Auth setup.
        });
      } else {
        form.reset({
          name: '',
          email: '',
          role: 'user',
          password: '',
        });
      }
    }
  }, [initialData, form, isOpen]);


  const handleSubmit: SubmitHandler<UserFormValues> = (data) => {
    const userDataToSubmit: Omit<User, 'id' | 'lastLogin'> & { password?: string } = {
        name: data.name,
        email: data.email,
        role: data.role,
        trackedChannels: initialData?.trackedChannels || { youtube: [], instagram: [] },
    };

    // For new users, the password from the form is for admin reference.
    // It's NOT used by this client-side function to create an Auth account.
    if (!isEditing && data.password && data.password.length > 0) {
        userDataToSubmit.password = data.password;
    }

    onSubmitUser(userDataToSubmit, initialData?.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit User Profile' : 'Create New User Profile'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the user's profile details below. Email cannot be changed here. Profile changes are saved to Firestore."
              : "Fill in the details to create a new user profile in Firestore. This profile is for data storage only."
            }
          </DialogDescription>
        </DialogHeader>
        {!isEditing && (
          <Alert variant="default" className="mt-4 bg-primary/10 border-primary/50">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary font-semibold">Important: Login Account Setup Required</AlertTitle>
            <AlertDescription className="text-primary/90">
              Creating a profile here **only saves data to Firestore for app use (name, role, etc.)**.
              <br/>For the user to actually log in, an admin **must also manually create an account for them in Firebase Authentication** (Build &gt; Authentication &gt; Users tab in your Firebase Console) using the same email and a password.
              The password field below is for your reference when doing so.
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} readOnly={isEditing} />
                  </FormControl>
                  {isEditing && <FormDescription>Email cannot be changed for existing user profiles via this form.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEditing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (for Admin Reference Only)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password for reference" {...field} />
                    </FormControl>
                    <FormDescription>Min 6 characters. This password is **for your reference only** when you manually create the user's login account in Firebase Authentication. This app will NOT use this password to create the login account.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
             {isEditing && ( // Optional: Show a note if editing about password not being handled here.
                <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Set/Update Password (via Firebase Console)</FormLabel>
                     <FormControl>
                      <Input type="password" placeholder="Password managed in Firebase Auth" {...field} disabled={true} value="********" />
                    </FormControl>
                    <FormDescription>User passwords must be managed directly in Firebase Authentication by an administrator.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">{initialData ? 'Save Profile Changes to Firestore' : 'Create User Profile in Firestore'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserForm;
