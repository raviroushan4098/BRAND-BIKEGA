
"use client";

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wand2, Youtube, Instagram as InstagramIcon } from 'lucide-react';
import { suggestContentImprovements, type SuggestContentImprovementsInput, type SuggestContentImprovementsOutput } from '@/ai/flows/suggest-content-improvements';
import { mockYouTubeData, mockInstagramData } from '@/lib/mockData'; // For pre-filling
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

// Simplified input for the form - in a real app, this would be richer
const formSchema = z.object({
  userRole: z.string().min(1, "User role is required."),
  // For demo, we'll use mock data directly rather than text areas for complex data
});

type FormValues = z.infer<typeof formSchema>;

const ContentSuggestionForm = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestContentImprovementsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userRole: user?.role || 'user',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    // Prepare data for the AI flow using mock data
    const aiInput: SuggestContentImprovementsInput = {
      youtubeData: mockYouTubeData.map(v => ({ 
        title: v.title, 
        likes: v.likes, 
        comments: v.comments, 
        views: v.views  // Changed from shares to views
      })),
      instagramData: mockInstagramData.map(p => ({ 
        thumbnail: p.thumbnailUrl, 
        likes: p.likes, 
        comments: p.comments, 
        timestamp: p.timestamp 
      })),
      userRole: data.userRole,
    };

    try {
      const result = await suggestContentImprovements(aiInput);
      setSuggestions(result);
      toast({ title: "Suggestions Generated!", description: "AI has provided content improvement ideas." });
    } catch (err) {
      console.error("Error getting AI suggestions:", err);
      setError("Failed to generate suggestions. Please try again.");
      toast({ title: "Error", description: "Failed to generate suggestions.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const canActivateTool = true; 

  if (!canActivateTool) {
    return (
      <Alert>
        <Wand2 className="h-4 w-4" />
        <AlertTitle>AI Suggestions Coming Soon!</AlertTitle>
        <AlertDescription>
          This tool will be activated after a substantial analytics collection period to provide you with the most accurate and personalized recommendations.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Wand2 className="h-8 w-8 text-primary" />
          <CardTitle className="text-3xl font-bold">AI Content Optimizer</CardTitle>
        </div>
        <CardDescription>
          Get personalized suggestions to improve your social media content, engagement, and reach.
          This demo uses pre-loaded mock data for YouTube and Instagram.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
           {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-5 w-5" />
                Generate Suggestions
              </>
            )}
          </Button>
        </CardFooter>
      </form>

      {suggestions && suggestions.suggestions.length > 0 && (
        <div className="p-6 border-t">
          <h3 className="text-2xl font-semibold mb-4">Here are your suggestions:</h3>
          <div className="space-y-6">
            {suggestions.suggestions.map((suggestion, index) => (
              <Card key={index} className="bg-background/50">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  {suggestion.platform === 'youtube' 
                    ? <Youtube className="h-6 w-6 text-red-600" /> 
                    : <InstagramIcon className="h-6 w-6 text-pink-600" />}
                  <CardTitle className="text-xl capitalize">{suggestion.platform} - {suggestion.type}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{suggestion.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ContentSuggestionForm;
