
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link2, Loader2, PlusCircle, Trash2, Copy, Users, BarChartBig } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { UtmLink } from '@/lib/utmLinkService';
import { addUtmLink, getUtmLinksForUser, deleteUtmLink } from '@/lib/utmLinkService';
import type { User } from '@/lib/authService';
import { getAllUsers as apiGetAllUsers } from '@/lib/authService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format, parseISO, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { fetchCampaignAnalytics, type CampaignAnalyticsOutput } from '@/ai/flows/fetch-ga-analytics-flow';
import GaAnalyticsDisplay from './GaAnalyticsDisplay';

const utmFormSchema = z.object({
  baseUrl: z.string().url({ message: "Please enter a valid URL (e.g., https://example.com)." }),
  utmSource: z.string().min(1, { message: "Source is required." }).regex(/^[a-zA-Z0-9_-]*$/, "No spaces or special characters."),
  utmMedium: z.string().min(1, { message: "Medium is required." }).regex(/^[a-zA-Z0-9_-]*$/, "No spaces or special characters."),
  utmCampaign: z.string().min(1, { message: "Campaign name is required." }).regex(/^[a-zA-Z0-9_-]*$/, "No spaces or special characters."),
});

type UtmFormValues = z.infer<typeof utmFormSchema>;

export default function UtmTrackerClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<UtmLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  
  const [usersForAdminSelect, setUsersForAdminSelect] = useState<User[]>([]);
  const [selectedUserIdForAdmin, setSelectedUserIdForAdmin] = useState<string>('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [gaPropertyId, setGaPropertyId] = useState('');
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false);
  const [currentAnalytics, setCurrentAnalytics] = useState<CampaignAnalyticsOutput | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [selectedCampaignForAnalytics, setSelectedCampaignForAnalytics] = useState<string>('');


  const form = useForm<UtmFormValues>({
    resolver: zodResolver(utmFormSchema),
    mode: 'onBlur',
    defaultValues: {
      baseUrl: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
    },
  });

  const { watch, handleSubmit, reset } = form;
  const currentTargetUserId = user?.role === 'admin' ? selectedUserIdForAdmin : user?.id;

  const fetchUsersForAdmin = useCallback(async () => {
    if (user?.role === 'admin') {
      setIsLoadingUsers(true);
      try {
        const fetchedUsers = await apiGetAllUsers();
        setUsersForAdminSelect(fetchedUsers);
      } catch (error) {
        toast({ title: "Error", description: "Could not load users.", variant: "destructive" });
      }
      setIsLoadingUsers(false);
    }
  }, [user?.role, toast]);

  useEffect(() => {
    fetchUsersForAdmin();
  }, [fetchUsersForAdmin]);

  const fetchLinks = useCallback(async () => {
    if (!currentTargetUserId) {
        setLinks([]);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const userLinks = await getUtmLinksForUser(currentTargetUserId);
    setLinks(userLinks);
    setIsLoading(false);
  }, [currentTargetUserId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  useEffect(() => {
    const subscription = watch((values) => {
      const { baseUrl, utmSource, utmMedium, utmCampaign } = values;
      try {
        new URL(baseUrl || "https://example.com");
        if (baseUrl && utmSource && utmMedium && utmCampaign) {
          const url = new URL(baseUrl);
          url.searchParams.set('utm_source', utmSource);
          url.searchParams.set('utm_medium', utmMedium);
          url.searchParams.set('utm_campaign', utmCampaign);
          setGeneratedUrl(url.toString());
        } else {
          setGeneratedUrl('');
        }
      } catch (error) {
        setGeneratedUrl('');
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const onSubmit: SubmitHandler<UtmFormValues> = async (data) => {
    if (!currentTargetUserId) {
      toast({ title: "Error", description: "A user must be selected.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const newLinkData = {
      ...data,
      userId: currentTargetUserId,
      generatedUrl,
    };
    const newLink = await addUtmLink(newLinkData);
    if (newLink) {
      setLinks(prev => [newLink, ...prev]);
      toast({ title: "Success", description: "UTM link saved successfully." });
      reset();
      setGeneratedUrl('');
    } else {
      toast({ title: "Error", description: "Failed to save UTM link.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (linkId: string) => {
    const success = await deleteUtmLink(linkId);
    if (success) {
      setLinks(prev => prev.filter(link => link.id !== linkId));
      toast({ title: "Success", description: "Link deleted." });
    } else {
      toast({ title: "Error", description: "Failed to delete link.", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "UTM link copied to clipboard." });
  };
  
  const handleFetchAnalytics = async (campaignName: string) => {
    if (!gaPropertyId) {
      toast({ title: "Missing ID", description: "Please enter your Google Analytics Property ID first.", variant: "destructive" });
      return;
    }
    setIsAnalyticsLoading(true);
    setCurrentAnalytics(null);
    setAnalyticsError(null);
    setSelectedCampaignForAnalytics(campaignName);
    setIsAnalyticsDialogOpen(true);

    try {
        const result = await fetchCampaignAnalytics({ propertyId: gaPropertyId, campaignName });
        if (result.error) {
          setAnalyticsError(result.error);
        } else {
          setCurrentAnalytics(result);
        }
    } catch (e: any) {
        setAnalyticsError(e.message || "An unexpected error occurred.");
    } finally {
        setIsAnalyticsLoading(false);
    }
  };


  return (
    <>
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Link2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">UTM Link Tracker</CardTitle>
          </div>
          <CardDescription>
            Create and manage UTM-tagged links. Connect to Google Analytics to see campaign performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Label htmlFor="gaPropertyId">Google Analytics Property ID</Label>
            <Input 
                id="gaPropertyId" 
                placeholder="Enter your GA4 Property ID..."
                value={gaPropertyId}
                onChange={(e) => setGaPropertyId(e.target.value)}
                className="max-w-sm mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
                Required to fetch campaign analytics. You can find this ID in your GA4 admin settings.
            </p>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-md">
          <CardHeader>
            <CardTitle>UTM Link Generator</CardTitle>
            <CardDescription>
              {user?.role === 'admin' 
                ? 'Select a user, then fill out the fields to create a tracked link.'
                : 'Fill out the fields to create a new tracked link.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.role === 'admin' && (
              <div className="space-y-2 mb-4">
                  <Label htmlFor="user-select-utm" className="flex items-center">
                      <Users className="mr-2 h-4 w-4" /> Select User
                  </Label>
                  <Select
                      value={selectedUserIdForAdmin}
                      onValueChange={setSelectedUserIdForAdmin}
                      disabled={isLoadingUsers}
                  >
                      <SelectTrigger id="user-select-utm">
                          <SelectValue placeholder="Select a user to manage..." />
                      </SelectTrigger>
                      <SelectContent>
                          {isLoadingUsers ? (
                              <SelectItem value="loading" disabled>Loading users...</SelectItem>
                          ) : usersForAdminSelect.length > 0 ? (
                              usersForAdminSelect.map(u => (
                                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                              ))
                          ) : (
                              <SelectItem value="no-users" disabled>No users available</SelectItem>
                          )}
                      </SelectContent>
                  </Select>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input id="baseUrl" placeholder="https://example.com/page" {...form.register('baseUrl')} />
                {form.formState.errors.baseUrl && <p className="text-destructive text-xs mt-1">{form.formState.errors.baseUrl.message}</p>}
              </div>
              <div>
                <Label htmlFor="utmSource">Campaign Source (utm_source)</Label>
                <Input id="utmSource" placeholder="e.g., youtube, newsletter" {...form.register('utmSource')} />
                 {form.formState.errors.utmSource && <p className="text-destructive text-xs mt-1">{form.formState.errors.utmSource.message}</p>}
              </div>
              <div>
                <Label htmlFor="utmMedium">Campaign Medium (utm_medium)</Label>
                <Input id="utmMedium" placeholder="e.g., social, email, cpc" {...form.register('utmMedium')} />
                 {form.formState.errors.utmMedium && <p className="text-destructive text-xs mt-1">{form.formState.errors.utmMedium.message}</p>}
              </div>
              <div>
                <Label htmlFor="utmCampaign">Campaign Name (utm_campaign)</Label>
                <Input id="utmCampaign" placeholder="e.g., summer_sale_2024" {...form.register('utmCampaign')} />
                 {form.formState.errors.utmCampaign && <p className="text-destructive text-xs mt-1">{form.formState.errors.utmCampaign.message}</p>}
              </div>
              <div>
                <Label htmlFor="generatedUrl">Generated URL</Label>
                <Input id="generatedUrl" value={generatedUrl} readOnly placeholder="Final URL will appear here..." className="bg-muted" />
              </div>
              <Button type="submit" disabled={isSubmitting || !generatedUrl || form.formState.isSubmitting || !form.formState.isValid || !currentTargetUserId} className="w-full">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle className="mr-2"/>}
                Save Link
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle>Saved Links</CardTitle>
            <CardDescription>
              {user?.role === 'admin' && selectedUserIdForAdmin
                  ? `Showing links for ${usersForAdminSelect.find(u => u.id === selectedUserIdForAdmin)?.name || 'the selected user'}.`
                  : user?.role === 'admin' 
                  ? 'Select a user to view their saved links.'
                  : 'Your previously generated UTM links.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !currentTargetUserId && user?.role === 'admin' ? (
                <p className="text-center text-muted-foreground py-10">Please select a user to view their links.</p>
            ) : links.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No links saved yet. Use the generator to create one.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Generated URL</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map(link => (
                      <TableRow key={link.id}>
                        <TableCell className="font-medium">{link.utmCampaign}</TableCell>
                        <TableCell>
                          <a href={link.generatedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs" title={link.generatedUrl}>
                            {link.generatedUrl}
                          </a>
                        </TableCell>
                        <TableCell>{isValid(parseISO(link.createdAt)) ? format(parseISO(link.createdAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleFetchAnalytics(link.utmCampaign)} title="View Analytics"><BarChartBig className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(link.generatedUrl)} title="Copy Link"><Copy className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(link.id)} title="Delete Link"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={isAnalyticsDialogOpen} onOpenChange={setIsAnalyticsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Campaign Analytics: "{selectedCampaignForAnalytics}"</DialogTitle>
                <DialogDescription>
                    Displaying data from Google Analytics for this campaign.
                </DialogDescription>
            </DialogHeader>
            <GaAnalyticsDisplay
                analytics={currentAnalytics}
                isLoading={isAnalyticsLoading}
                error={analyticsError}
                campaignName={selectedCampaignForAnalytics}
                onRetry={() => handleFetchAnalytics(selectedCampaignForAnalytics)}
            />
        </DialogContent>
      </Dialog>
    </>
  );
}
