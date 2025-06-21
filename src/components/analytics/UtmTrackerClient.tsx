"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link2, Loader2, PlusCircle, Trash2, Copy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { UtmLink } from '@/lib/utmLinkService';
import { addUtmLink, getUtmLinksForUser, deleteUtmLink } from '@/lib/utmLinkService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format, parseISO, isValid } from 'date-fns';

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

  const fetchLinks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const userLinks = await getUtmLinksForUser(user.id);
    setLinks(userLinks);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  useEffect(() => {
    const subscription = watch((values) => {
      const { baseUrl, utmSource, utmMedium, utmCampaign } = values;
      try {
        new URL(baseUrl || "https://example.com"); // check if base is a valid url structure
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
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const newLinkData = {
      ...data,
      userId: user.id,
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

  return (
    <>
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Link2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">UTM Link Tracker</CardTitle>
          </div>
          <CardDescription>
            Create and manage UTM-tagged links to track your campaign performance in analytics tools like Google Analytics.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-md">
          <CardHeader>
            <CardTitle>UTM Link Generator</CardTitle>
            <CardDescription>Fill out the fields to create a new tracked link.</CardDescription>
          </CardHeader>
          <CardContent>
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
              <Button type="submit" disabled={isSubmitting || !generatedUrl || form.formState.isSubmitting || !form.formState.isValid} className="w-full">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle className="mr-2"/>}
                Save Link
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle>Saved Links</CardTitle>
            <CardDescription>Your previously generated UTM links.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
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
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(link.generatedUrl)}><Copy className="mr-2 h-3 w-3"/>Copy</Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(link.id)}><Trash2 className="h-4 w-4" /></Button>
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
    </>
  );
}
