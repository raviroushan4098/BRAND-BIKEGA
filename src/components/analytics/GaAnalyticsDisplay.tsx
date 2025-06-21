
"use client";

import { CampaignAnalyticsOutput } from '@/ai/flows/fetch-ga-analytics-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, BarChart2, CheckCircle, Percent, Lightbulb } from 'lucide-react';
import { Button } from '../ui/button';

interface GaAnalyticsDisplayProps {
  analytics: CampaignAnalyticsOutput | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  campaignName: string;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType; }> = ({ title, value, icon: Icon }) => (
  <Card className="flex-1 min-w-[120px] shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const GaAnalyticsDisplay: React.FC<GaAnalyticsDisplayProps> = ({ analytics, isLoading, error, onRetry, campaignName }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-[300px] text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-md text-muted-foreground">Fetching analytics for "{campaignName}"...</p>
      </div>
    );
  }

  if (error && !analytics?.aiSummary) { // Show big error only if there's no data at all
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center min-h-[300px]">
        <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
        <p className="text-md text-destructive font-semibold mb-2">Error Fetching Analytics</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">Try Again</Button>
        )}
      </div>
    );
  }

  if (!analytics || (analytics.sessions === 0 && !analytics.error)) {
    return (
      <div className="p-6 text-center min-h-[300px] flex flex-col items-center justify-center">
        <CardTitle className="text-lg font-semibold mb-2">No Activity Found</CardTitle>
        <p className="text-sm text-muted-foreground">
            No analytics data was found for the campaign "{campaignName}" in the last 90 days.
        </p>
        
        {analytics.aiSummary && (
            <p className="mt-4 italic text-xs bg-muted p-2 rounded-md w-full">
                AI Summary: {analytics.aiSummary}
            </p>
        )}

        <div className="mt-6 text-xs text-left text-muted-foreground border-t pt-4 w-full">
            <h4 className="font-semibold text-center mb-2">Common Reasons for No Data:</h4>
            <ul className="list-disc list-inside space-y-1">
                <li><strong>Timing:</strong> It can take several hours (up to 24) for new visits to appear in Google Analytics.</li>
                <li><strong>No Visits:</strong> The link may not have been visited yet. Try visiting it in an incognito window.</li>
                <li><strong>GA Setup:</strong> Ensure the Google Analytics tracking code is correctly installed on the destination website.</li>
            </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      <Card className="bg-muted/50">
          <CardHeader>
              <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                      <CardTitle className="text-base font-semibold">AI Summary</CardTitle>
                      <CardDescription className="text-sm">
                          {analytics.aiSummary}
                      </CardDescription>
                  </div>
              </div>
          </CardHeader>
           {analytics.error && (
              <CardContent>
                 <p className="text-xs text-destructive">Note: {analytics.error}</p>
              </CardContent>
           )}
      </Card>

      <div className="flex flex-wrap gap-4">
        <StatCard title="Sessions" value={analytics.sessions.toLocaleString()} icon={BarChart2} />
        <StatCard title="Engagement Rate" value={`${(analytics.engagementRate * 100).toFixed(1)}%`} icon={Percent} />
        <StatCard title="Conversions" value={analytics.conversions.toLocaleString()} icon={CheckCircle} />
      </div>
      <p className="text-xs text-muted-foreground text-center pt-2">Data from the last 90 days.</p>
    </div>
  );
};

export default GaAnalyticsDisplay;
