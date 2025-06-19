
"use client";

import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { ApiKey } from '@/lib/apiKeyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';

const apiKeyFormSchema = z.object({
  serviceName: z.string().min(2, "Service name must be at least 2 characters."),
  keyValue: z.string().min(10, "API Key value must be at least 10 characters."),
  description: z.string().optional(),
});

type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;

interface ApiKeyFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitApiKey: (data: ApiKeyFormValues, currentApiKeyId?: string) => void;
  initialData?: ApiKey | null;
  isLoading?: boolean;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ isOpen, onOpenChange, onSubmitApiKey, initialData, isLoading }) => {
  const isEditing = !!initialData;
  const [showKeyValue, setShowKeyValue] = React.useState(false);

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      serviceName: '',
      keyValue: '',
      description: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          serviceName: initialData.serviceName,
          keyValue: initialData.keyValue,
          description: initialData.description || '',
        });
      } else {
        form.reset({
          serviceName: '',
          keyValue: '',
          description: '',
        });
      }
      setShowKeyValue(false); // Reset visibility on open
    }
  }, [initialData, form, isOpen]);

  const handleSubmit: SubmitHandler<ApiKeyFormValues> = (data) => {
    onSubmitApiKey(data, initialData?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit API Key' : 'Add New API Key'}</DialogTitle>
          <DialogDescription>
            Enter the details for the API key.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Warning</AlertTitle>
          <AlertDescription>
            API keys are stored directly in Firestore. For production environments with sensitive keys, use a dedicated secrets manager for enhanced security.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="serviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., OpenAI, Google Maps" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keyValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key Value</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showKeyValue ? "text" : "password"} 
                        placeholder="Enter the API key" 
                        {...field} 
                        className="pr-10"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                      onClick={() => setShowKeyValue(!showKeyValue)}
                      aria-label={showKeyValue ? "Hide API key" : "Show API key"}
                    >
                      {showKeyValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Used for content generation feature" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save API Key' : 'Add API Key')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyForm;
