
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ApiKeyTable from '@/components/admin/ApiKeyTable';
import ApiKeyForm from '@/components/admin/ApiKeyForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlusCircle, KeyRound, RefreshCw, AlertTriangle } from 'lucide-react';
import type { ApiKey } from '@/lib/apiKeyService';
import {
  getAllApiKeys as apiGetAllApiKeys,
  addApiKey as apiAddApiKey,
  updateApiKey as apiUpdateApiKey,
  deleteApiKey as apiDeleteApiKey
} from '@/lib/apiKeyService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth'; // To potentially associate keys with users

export default function ApiManagementPage() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchApiKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedKeys = await apiGetAllApiKeys();
      setApiKeys(fetchedKeys);
    } catch (error) {
      toast({ title: "Error Fetching API Keys", description: "Could not load API key data.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleAddKey = () => {
    setEditingApiKey(null);
    setIsFormOpen(true);
  };

  const handleEditKey = (apiKey: ApiKey) => {
    setEditingApiKey(apiKey);
    setIsFormOpen(true);
  };

  const handleDeleteKey = async (apiKeyId: string) => {
    if (!window.confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }
    setIsLoading(true);
    const success = await apiDeleteApiKey(apiKeyId);
    if (success) {
      setApiKeys(prevKeys => prevKeys.filter(key => key.id !== apiKeyId));
      toast({ title: "API Key Deleted", description: `API key has been removed.` });
    } else {
      toast({ title: "Error", description: "Failed to delete API key.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleSubmitKey = async (apiKeyData: Omit<ApiKey, 'id' | 'createdAt' | 'userId'>, currentApiKeyId?: string) => {
    setIsLoading(true);
    const payload = { ...apiKeyData, userId: user?.id }; // Associate key with current admin

    if (currentApiKeyId) { // Editing existing key
      const success = await apiUpdateApiKey(currentApiKeyId, payload);
      if (success) {
        await fetchApiKeys(); // Refetch to get updated list
        toast({ title: "API Key Updated", description: `${apiKeyData.serviceName} key has been updated.` });
      } else {
        toast({ title: "Error", description: "Failed to update API key.", variant: "destructive" });
      }
    } else { // Adding new key
      const newKey = await apiAddApiKey(payload);
      if (newKey) {
        await fetchApiKeys(); // Refetch to get new key in list
        toast({ title: "API Key Added", description: `${newKey.serviceName} key has been added.` });
      } else {
        toast({ title: "Error", description: "Failed to add API key.", variant: "destructive" });
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
                <KeyRound className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold">API Key Management</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchApiKeys} variant="outline" size="lg" disabled={isLoading}>
                  <RefreshCw className={`mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                <Button onClick={handleAddKey} size="lg" disabled={isLoading}>
                  <PlusCircle className="mr-2 h-5 w-5" /> Add New API Key
                </Button>
              </div>
            </div>
            <CardDescription>
              Manage API keys for external services or integrations used by the application.
            </CardDescription>
          </CardHeader>
        </Card>

        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important Security Notice</AlertTitle>
          <AlertDescription>
            API keys are sensitive credentials. They are stored directly in Firestore in this system.
            For production environments, especially with high-privilege keys, using a dedicated secrets management service (e.g., Google Secret Manager, HashiCorp Vault) is strongly recommended for enhanced security.
            Treat these keys like passwords and ensure Firestore security rules are appropriately configured.
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="pt-6">
            {isLoading && apiKeys.length === 0 ? (
              <div className="text-center py-10">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading API keys...</p>
              </div>
            ) : apiKeys.length > 0 ? (
              <ApiKeyTable apiKeys={apiKeys} onEditApiKey={handleEditKey} onDeleteApiKey={handleDeleteKey} isLoading={isLoading} />
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No API keys found.</p>
                <Button onClick={handleAddKey} className="mt-4" disabled={isLoading}>
                  Add First API Key
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <ApiKeyForm
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSubmitApiKey={handleSubmitKey}
          initialData={editingApiKey}
          isLoading={isLoading}
        />
      </div>
    </AppLayout>
  );
}
