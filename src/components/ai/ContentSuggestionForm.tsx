
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MessageSquare, Send, UserCircle, Bot, AlertTriangle } from 'lucide-react';
import { generalQuery, type GeneralQueryInput } from '@/ai/flows/general-query-flow.ts';
import { mockYouTubeData, mockInstagramData } from '@/lib/mockData'; 
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { checkAndIncrementChatUsage, type CheckChatUsageInput } from '@/ai/flows/check-chat-usage-flow';
import { getChatUsageStatus, type GetChatUsageStatusInput } from '@/ai/flows/get-chat-usage-status-flow';

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
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
    .replace(/\*(.*?)\*/g, '<em>$1</em>');          
};

const ContentSuggestionForm = () => {
  const { user } = useAuth();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null); 

  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number>(10); // Default, will be updated from flow
  const [chatLimitError, setChatLimitError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchInitialUsage = async () => {
      if (user?.id) {
        try {
          const status = await getChatUsageStatus({ userId: user.id });
          if (status.error) {
            console.warn("Could not fetch initial chat usage:", status.error);
            setMessagesRemaining(10); // Fallback to full limit on error
            setDailyLimit(10);
          } else {
            setMessagesRemaining(status.messagesRemaining);
            setDailyLimit(status.dailyLimit);
            if (status.messagesRemaining <= 0) {
              setChatLimitError(`You have reached your daily limit of ${status.dailyLimit} messages. Please try again tomorrow.`);
            } else {
              setChatLimitError(null);
            }
          }
        } catch (e) {
          console.warn("Error fetching initial chat usage:", e);
          setMessagesRemaining(10);
          setDailyLimit(10);
        }
      } else {
        setMessagesRemaining(null); 
        setDailyLimit(10);
        setChatLimitError(null);
      }
    };
    fetchInitialUsage();
  }, [user]);


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!user || !user.id) {
      setError("User not authenticated. Please log in.");
      toast({ title: "Authentication Error", description: "Please log in to use the AI chat.", variant: "destructive" });
      return;
    }
    
    setChatLimitError(null);
    setIsLoading(true);
    setError(null);

    try {
      const usageInput: CheckChatUsageInput = { userId: user.id };
      const usageResult = await checkAndIncrementChatUsage(usageInput);

      setMessagesRemaining(usageResult.messagesRemaining);
      setDailyLimit(usageResult.dailyLimit);

      if (usageResult.error) {
          setError(`Usage check error: ${usageResult.error}`);
          toast({ title: "Chat Usage Error", description: usageResult.error, variant: "destructive" });
          setIsLoading(false);
          return;
      }

      // Add user message to chat history regardless of limit for user's reference
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: data.userQuery,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, userMessage]);
      form.reset();

      if (!usageResult.allowed || usageResult.limitReached) {
        const limitMsg = `You have reached your daily limit of ${usageResult.dailyLimit} messages. Please try again tomorrow. Messages remaining: ${usageResult.messagesRemaining}.`;
        setChatLimitError(limitMsg);
        toast({
          title: "Daily Limit Reached",
          description: `You have used all your ${usageResult.dailyLimit} messages for today.`,
          variant: "default", // Changed to default as it's not a destructive error, but an info
        });
        setIsLoading(false);
        return;
      }
    } catch (usageError: any) {
      setError("Failed to check chat usage limit. Please try again.");
      toast({ title: "Chat Usage Error", description: usageError.message || "Could not verify chat limit.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    // If allowed, proceed to call AI
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
      toast({ title: "AI Response Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full shadow-xl flex flex-col max-h-[80vh]">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-bold">Ask InsightStream AI</CardTitle>
            </div>
            {user && messagesRemaining !== null && (
                <div className="text-sm text-muted-foreground">
                    Messages Today: {dailyLimit - messagesRemaining} / {dailyLimit}
                </div>
            )}
        </div>
        <CardDescription>
          Have questions about your social media strategy, content ideas, or performance? Ask our AI assistant!
          Context from mock YouTube & Instagram data is provided to the AI. Daily limit: {dailyLimit} messages.
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

      <CardFooter className="border-t p-4 shrink-0 flex-col items-start">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full items-start gap-2">
          <Textarea
            {...form.register('userQuery')}
            placeholder="Type your question or request here..."
            className="flex-grow resize-none min-h-[40px]"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (form.formState.isValid && !isLoading && !chatLimitError) {
                  form.handleSubmit(onSubmit)();
                }
              }
            }}
            disabled={isLoading || !!chatLimitError}
          />
          <Button type="submit" disabled={isLoading || !form.formState.isValid || !!chatLimitError} size="icon" className="h-auto p-3 shrink-0">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send</span>
          </Button>
        </form>
        {form.formState.errors.userQuery && (
          <p className="text-xs text-destructive mt-1 w-full">{form.formState.errors.userQuery.message}</p>
        )}
        {chatLimitError && (
          <Alert variant="default" className="mt-2 w-full bg-amber-100 border-amber-300 text-amber-700">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Limit Reached</AlertTitle>
            <AlertDescription>{chatLimitError}</AlertDescription>
          </Alert>
        )}
        {error && !isLoading && !chatLimitError && ( 
          <Alert variant="destructive" className="mt-2 w-full">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  );
};

export default ContentSuggestionForm;

