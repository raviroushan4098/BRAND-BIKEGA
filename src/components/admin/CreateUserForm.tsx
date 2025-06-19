
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
  youtubeChannels: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s) : []),
  instagramProfiles: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(s => s) : []),
});

const createUserSchema = userFormSchemaBase.extend({
  password: z.string().min(6, "Password must be at least 6 characters (for reference, auth account needs separate admin creation)."),
});

const editUserSchema = userFormSchemaBase.extend({
  password: z.string().optional(), 
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
      youtubeChannels: [],
      instagramProfiles: [],
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
          youtubeChannels: initialData.trackedChannels?.youtube || [],
          instagramProfiles: initialData.trackedChannels?.instagram || [],
          password: '', 
        });
      } else {
        form.reset({ 
          name: '',
          email: '',
          role: 'user',
          youtubeChannels: [],
          instagramProfiles: [],
          password: '',
        });
      }
    }
  }, [initialData, form, isOpen]);


  const handleSubmit: SubmitHandler<UserFormValues> = (data) => {
    const userDataToSubmit: Omit<User, 'id' | 'lastLogin'> & { password?: string } = {
        name: data.name,
        email: data.email, // Email is collected
        role: data.role,
        trackedChannels: {
            youtube: data.youtubeChannels as string[] | undefined, 
            instagram: data.instagramProfiles as string[] | undefined, 
        }
    };
    
    if (data.password && data.password.length > 0) {
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
              : 'Fill in the details to create a new user profile in Firestore. The password field is for reference. The user\'s authentication account (for login) must be created separately by an admin in Firebase Authentication.'
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
                    <FormLabel>Password (for reference)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Set initial password" {...field} />
                    </FormControl>
                    <FormDescription>Min 6 characters. This is for record-keeping; the actual login account requires admin setup in Firebase Auth.</FormDescription>
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
             <FormField
              control={form.control}
              name="youtubeChannels"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>YouTube Channel IDs</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="UC...,UC..." 
                      value={Array.isArray(value) ? value.join(',') : ''}
                      onChange={(e) => onChange(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
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
                      onChange={(e) => onChange(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
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
              <Button type="submit">{initialData ? 'Save Changes to Profile' : 'Create User Profile'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserForm;
