
"use client";

import type { VideoTextAnalysisOutput } from '@/ai/flows/analyze-video-text-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Lightbulb, Smile, Frown, Meh, MessagesSquare, Tag, ListChecks } from 'lucide-react';

interface NLPReportDisplayProps {
  analysisResult: VideoTextAnalysisOutput | null;
  isLoading: boolean;
  error: string | null;
}

const NLPReportDisplay: React.FC<NLPReportDisplayProps> = ({ analysisResult, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[300px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Analyzing video content...</p>
        <p className="text-sm text-muted-foreground">This may take a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center min-h-[300px]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg text-destructive mb-2">Error During Analysis</p>
        <p className="text-sm text-muted-foreground mb-3">{error}</p>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground min-h-[300px] flex items-center justify-center">
        No analysis data available.
      </div>
    );
  }

  const sentimentIcon = (sentiment: VideoTextAnalysisOutput['overallSentiment']) => {
    switch (sentiment) {
      case 'positive': return <Smile className="h-5 w-5 text-green-500" />;
      case 'negative': return <Frown className="h-5 w-5 text-red-500" />;
      case 'neutral': return <Meh className="h-5 w-5 text-yellow-500" />;
      case 'mixed': return <MessagesSquare className="h-5 w-5 text-blue-500" />;
      default: return <Meh className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 p-1">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {sentimentIcon(analysisResult.overallSentiment)}
            <CardTitle className="text-xl">Sentiment Analysis</CardTitle>
          </div>
          <CardDescription className="capitalize">Overall: {analysisResult.overallSentiment}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{analysisResult.sentimentSummary}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
             <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Positive Keywords</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {analysisResult.topPositiveKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {analysisResult.topPositiveKeywords.map(keyword => (
                  <Badge key={keyword} variant="default" className="bg-green-100 text-green-700 border-green-300">
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No distinct positive keywords identified.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg">Negative Keywords</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {analysisResult.topNegativeKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {analysisResult.topNegativeKeywords.map(keyword => (
                  <Badge key={keyword} variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No distinct negative keywords identified.</p>}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-accent" />
            <CardTitle className="text-xl">Identified Topics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {analysisResult.identifiedTopics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysisResult.identifiedTopics.map(topic => (
                <Badge key={topic} variant="secondary">{topic}</Badge>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No specific topics identified.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-xl">Content Suggestions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {analysisResult.contentSuggestions.length > 0 ? (
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {analysisResult.contentSuggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No specific suggestions generated at this time.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default NLPReportDisplay;

