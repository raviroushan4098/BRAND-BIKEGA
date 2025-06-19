
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

const userFormSchemaBase = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  role: z.enum(['user', 'admin']),
});

// Schema for creating a new user, password is required and will be stored in Firestore
const createUserSchema = userFormSchemaBase.extend({
  password: z.string().min(6, "Password must be at least 6 characters."),
});

// Schema for editing an existing user, password is optional
const editUserSchema = userFormSchemaBase.extend({
  password: z.string().min(6, "New password must be at least 6 characters.").optional().or(z.literal('')),
});

type UserFormValues = z.infer<typeof createUserSchema> | z.infer<typeof editUserSchema>;

interface CreateUserFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitUser: (data: Omit<User, 'id' | 'lastLogin'>, currentUserId?: string) => void;
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
          password: '', 
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
    const userDataToSubmit: any = { 
      name: data.name,
      email: data.email,
      role: data.role,
      trackedChannels: initialData?.trackedChannels || { youtube: [], instagram: [] },
    };

    if (!isEditing) { 
        if (!data.password) { 
            form.setError("password", { type: "manual", message: "Password is required for new users." });
            return;
        }
        userDataToSubmit.password = data.password;
    } else { 
        if (data.password) { 
            userDataToSubmit.password = data.password;
        }
    }

    onSubmitUser(userDataToSubmit as Omit<User, 'id' | 'lastLogin'>, initialData?.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit User Profile' : 'Create New User Profile'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the user's profile details below. Email cannot be changed here."
              : "Fill in the details to create a new user profile. The password will be stored for login."
            }
          </DialogDescription>
        </DialogHeader>
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
                    <Input type="email" placeholder="user@example.com" {...field} readOnly={isEditing && initialData?.email === "davbhagalpur52@gmail.com"} />
                  </FormControl>
                  {isEditing && initialData?.email === "davbhagalpur52@gmail.com" && <FormDescription>The admin demo email cannot be changed.</FormDescription>}
                  {isEditing && initialData?.email !== "davbhagalpur52@gmail.com" && <FormDescription>Email cannot be changed for existing user profiles.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEditing ? 'New Password (optional)' : 'Password'}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={isEditing ? "Leave blank to keep current" : "Enter password"} {...field} />
                  </FormControl>
                  <FormDescription>
                    {isEditing ? "Enter a new password to change it. Min 6 characters." : "Min 6 characters. This password will be used for login."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing && initialData?.email === "davbhagalpur52@gmail.com" && initialData.role === "admin"}>
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
                  {isEditing && initialData?.email === "davbhagalpur52@gmail.com" && initialData.role === "admin" && <FormDescription>The admin demo role cannot be changed.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">{initialData ? 'Save Profile Changes' : 'Create User Profile'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserForm;
