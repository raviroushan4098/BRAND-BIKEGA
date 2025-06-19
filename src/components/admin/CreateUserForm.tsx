
"use client";

import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { User } from '@/lib/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  role: z.enum(['user', 'admin']),
  youtubeChannels: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s) : []),
  instagramProfiles: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s) : []),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface CreateUserFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitUser: (data: Omit<User, 'id' | 'lastLogin'>, currentUserId?: string) => void;
  initialData?: User | null;
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({ isOpen, onOpenChange, onSubmitUser, initialData }) => {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'user',
      youtubeChannels: [],
      instagramProfiles: [],
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        email: initialData.email,
        role: initialData.role,
        youtubeChannels: initialData.trackedChannels?.youtube || [],
        instagramProfiles: initialData.trackedChannels?.instagram || [],
      });
    } else {
      form.reset({
        name: '',
        email: '',
        role: 'user',
        youtubeChannels: [],
        instagramProfiles: [],
      });
    }
  }, [initialData, form, isOpen]); // Added isOpen to reset form when dialog opens

  const handleSubmit: SubmitHandler<UserFormValues> = (data) => {
    const userDataToSubmit = {
        name: data.name,
        email: data.email,
        role: data.role,
        trackedChannels: {
            youtube: data.youtubeChannels,
            instagram: data.instagramProfiles,
        }
    };
    onSubmitUser(userDataToSubmit, initialData?.id);
    onOpenChange(false); // Close dialog on submit
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit User' : 'Create New User'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update the user details below.' : 'Fill in the details to create a new user.'}
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
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
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
             <FormField
              control={form.control}
              name="youtubeChannels"
              render={({ field: { onChange, value, ...rest } }) => ( // Destructure to correctly handle array from string transform
                <FormItem>
                  <FormLabel>YouTube Channel IDs</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="UC...,UC..." 
                      value={Array.isArray(value) ? value.join(',') : ''} // Ensure value is string for Input
                      onChange={(e) => onChange(e.target.value)} // Pass string value up
                      {...rest}
                    />
                  </FormControl>
                  <FormDescription>Comma-separated list of YouTube Channel IDs.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instagramProfiles"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Instagram Profile Names</FormLabel>
                  <FormControl>
                     <Input 
                      placeholder="profile1,profile2" 
                      value={Array.isArray(value) ? value.join(',') : ''}
                      onChange={(e) => onChange(e.target.value)}
                      {...rest}
                    />
                  </FormControl>
                  <FormDescription>Comma-separated list of Instagram profile names.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">{initialData ? 'Save Changes' : 'Create User'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserForm;
