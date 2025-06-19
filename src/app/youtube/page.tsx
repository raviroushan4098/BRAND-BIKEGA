
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import YouTubeCard from '@/components/analytics/YouTubeCard';
import { mockYouTubeData, type YouTubeVideo } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/lib/authService';
import { getAllUsers as apiGetAllUsers } from '@/lib/authService';
import { assignYouTubeLinksToUser } from '@/lib/youtubeLinkService'; // Import the new service
import { toast } from '@/hooks/use-toast';
import { BarChart3, UserPlus, LinkIcon, FileText, UploadCloud, Users } from 'lucide-react';

export default function YouTubeManagementPage() {
  const { user } = useAuth();
  const videos: YouTubeVideo[] = mockYouTubeData; // Still using mock data for display

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [singleLink, setSingleLink] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (user?.role === 'admin') {
      setIsLoadingUsers(true);
      try {
        const fetchedUsers = await apiGetAllUsers();
        setUsers(fetchedUsers.filter(u => u.id !== user.id)); // Exclude current admin from list
      } catch (error) {
        toast({ title: "Error Fetching Users", description: "Could not load user data.", variant: "destructive" });
      }
      setIsLoadingUsers(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAssignLinks = async () => {
    if (!selectedUserId) {
      toast({ title: "No User Selected", description: "Please select a user to assign links to.", variant: "destructive" });
      return;
    }
    if (!singleLink && !csvFile) {
      toast({ title: "No Links Provided", description: "Please enter a link or upload a CSV file.", variant: "destructive" });
      return;
    }

    setIsAssigning(true);
    let newLinks: string[] = [];

    if (singleLink.trim()) {
      if (isValidHttpUrl(singleLink.trim())) {
        newLinks.push(singleLink.trim());
      } else {
        toast({ title: "Invalid URL", description: "The single link provided is not a valid URL.", variant: "destructive" });
        setIsAssigning(false);
        return;
      }
    }

    if (csvFile) {
      try {
        const csvLinks = await parseCsvFile(csvFile);
        const validCsvLinks = csvLinks.filter(isValidHttpUrl);
        newLinks = newLinks.concat(validCsvLinks);
        if (csvLinks.length !== validCsvLinks.length) {
          toast({ title: "CSV Processed with Exclusions", description: "Some invalid URLs were excluded from the CSV.", variant: "default" });
        }
      } catch (error) {
        toast({ title: "CSV Parsing Error", description: "Could not parse the CSV file.", variant: "destructive" });
        setIsAssigning(false);
        return;
      }
    }

    if (newLinks.length === 0) {
      toast({ title: "No Valid Links", description: "No valid YouTube links were found to assign.", variant: "destructive" });
      setIsAssigning(false);
      return;
    }
    
    // Ensure uniqueness of links being added now. The service will handle merging with existing.
    const uniqueNewLinks = Array.from(new Set(newLinks));

    const success = await assignYouTubeLinksToUser(selectedUserId, uniqueNewLinks);

    if (success) {
      const targetUser = users.find(u => u.id === selectedUserId); // For toast message
      toast({ title: "Links Assigned", description: `Successfully assigned ${uniqueNewLinks.length} new unique link(s) to ${targetUser?.name || 'the selected user'}.` });
      setSingleLink('');
      setCsvFile(null);
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      // Optionally, re-fetch links for the user if displaying them, but not users list unless it changed.
    } else {
      toast({ title: "Assignment Failed", description: "Could not assign links to the user in the 'youtube' collection.", variant: "destructive" });
    }
    setIsAssigning(false);
  };

  const isValidHttpUrl = (string: string) => {
    let url;
    try {
      url = new URL(string);
    } catch (_) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  };

  const parseCsvFile = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) {
          resolve([]);
          return;
        }
        const lines = text.split(/\r\n|\n/);
        const urls = lines.map(line => line.split(',')[0].trim()).filter(Boolean);
        resolve(urls);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold">YouTube Management</CardTitle>
              </div>
            </div>
            <CardDescription>
              Overview of YouTube video performance and tools for channel management.
            </CardDescription>
          </CardHeader>
        </Card>

        {user?.role === 'admin' && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <UserPlus className="h-6 w-6 text-accent" />
                <CardTitle className="text-2xl font-semibold">Assign YouTube Links to User</CardTitle>
              </div>
              <CardDescription>Select a user and provide YouTube links to track for them. Links will be stored under 'youtube/{'{userId}'}/links'.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="user-select" className="flex items-center mb-2">
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" /> Select User
                </Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoadingUsers || isAssigning}>
                  <SelectTrigger id="user-select" className="w-full md:w-1/2">
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingUsers ? (
                      <SelectItem value="loading" disabled>Loading users...</SelectItem>
                    ) : users.length > 0 ? (
                      users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-users" disabled>No users available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="single-link" className="flex items-center mb-2">
                  <LinkIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Add Single YouTube Link
                </Label>
                <Input
                  id="single-link"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=example"
                  value={singleLink}
                  onChange={(e) => setSingleLink(e.target.value)}
                  className="w-full md:w-1/2"
                  disabled={isAssigning}
                />
              </div>

              <div className="relative">
                <Label htmlFor="csv-upload" className="flex items-center mb-2">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Or Upload CSV with Links
                </Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full md:w-1/2 pt-2"
                  disabled={isAssigning}
                />
                <p className="text-xs text-muted-foreground mt-1">CSV should contain one YouTube URL per line, or URLs in the first column.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAssignLinks} disabled={isAssigning || !selectedUserId || (!singleLink && !csvFile)}>
                <UploadCloud className="mr-2 h-5 w-5" />
                {isAssigning ? 'Assigning...' : 'Assign Links'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <YouTubeCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No YouTube data available to display.</p>
              <p className="text-sm text-muted-foreground">Assigned YouTube channels will appear here for users.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
