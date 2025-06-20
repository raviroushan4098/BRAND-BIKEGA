
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from "@/components/ui/alert"; // Removed AlertTitle as it's not used
import { Loader2, MessageSquare, Send, UserCircle, Bot } from 'lucide-react';
import { generalQuery, type GeneralQueryInput } from '@/ai/flows/general-query-flow'; // Removed GeneralQueryOutput as it's not directly typed here
import { mockYouTubeData, mockInstagramData } from '@/lib/mockData'; 
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const formSchema = z.object({
  userQuery: z.string().min(3, "Query must be at least 3 characters long."),
});

type FormValues = z.infer<typeof formSchema>;

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const applyBasicMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold: **text**
    .replace(/\*(.*?)\*/g, '<em>$1</em>');          // Italic: *text*
};

const ContentSuggestionForm = () => {
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null); 

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userQuery: '',
    },
  });

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    setError(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: data.userQuery,
      timestamp: new Date(),
    };
    setChatHistory(prev => [...prev, userMessage]);
    form.reset(); 

    const youtubeDataContext = mockYouTubeData.map(v => ({ 
        title: v.title, 
        likes: v.likes, 
        comments: v.comments, 
        views: v.views 
    }));
    const instagramDataContext = mockInstagramData.map(p => ({ 
        thumbnail: p.thumbnailUrl, 
        likes: p.likes, 
        comments: p.comments, 
        timestamp: p.timestamp,
        caption: p.caption 
    }));

    const aiInput: GeneralQueryInput = {
      userQuery: data.userQuery,
      userRole: user?.role || 'user',
      youtubeData: youtubeDataContext,
      instagramData: instagramDataContext,
    };

    try {
      const result = await generalQuery(aiInput);
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: result.aiResponse,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error("Error getting AI response:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to get response from AI. Please try again.";
      setError(errorMessage);
      const aiErrorMessage: ChatMessage = {
        id: `ai-error-${Date.now()}`,
        type: 'ai',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
      }
      setChatHistory(prev => [...prev, aiErrorMessage]);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full shadow-xl flex flex-col max-h-[80vh]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          <CardTitle className="text-3xl font-bold">Ask InsightStream AI</CardTitle>
        </div>
        <CardDescription>
          Have questions about your social media strategy, content ideas, or performance? Ask our AI assistant!
          Context from mock YouTube & Instagram data is provided to the AI.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-y-auto p-6" ref={chatContainerRef}> 
        <div className="space-y-4">
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex items-end space-x-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.type === 'ai' && <Bot className="h-6 w-6 text-primary flex-shrink-0 mb-1" />}
              <div className={`max-w-[70%] p-3 rounded-lg shadow-md ${msg.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {msg.type === 'ai' ? (
                  <div
                    className="text-sm whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: applyBasicMarkdown(msg.content) }}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                <p className="text-xs opacity-70 mt-1 text-right">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.type === 'user' && <UserCircle className="h-6 w-6 text-muted-foreground flex-shrink-0 mb-1" />}
            </div>
          ))}
          {isLoading && chatHistory[chatHistory.length-1]?.type === 'user' && (
            <div className="flex items-end space-x-2 justify-start">
              <Bot className="h-6 w-6 text-primary flex-shrink-0 mb-1" />
              <div className="max-w-[70%] p-3 rounded-lg bg-muted text-muted-foreground shadow-md">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t p-4 shrink-0">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full items-start gap-2">
          <Textarea
            {...form.register('userQuery')}
            placeholder="Type your question or request here... (e.g., 'Suggest 3 video ideas for my gaming channel')"
            className="flex-grow resize-none min-h-[40px]"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (form.formState.isValid && !isLoading) {
                  form.handleSubmit(onSubmit)();
                }
              }
            }}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !form.formState.isValid} size="icon" className="h-auto p-3 shrink-0">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
        {form.formState.errors.userQuery && (
          <p className="text-xs text-destructive mt-1 w-full">{form.formState.errors.userQuery.message}</p>
        )}
        {error && !isLoading && (
          <Alert variant="destructive" className="mt-2 w-full">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  );
};

export default ContentSuggestionForm;
