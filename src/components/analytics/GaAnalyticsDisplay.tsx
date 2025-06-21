
"use client";

import { CampaignAnalyticsOutput } from '@/ai/flows/fetch-ga-analytics-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Users, BarChart2, CheckCircle, Percent, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GaAnalyticsDisplayProps {
  analytics: CampaignAnalyticsOutput | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  campaignName: string;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType; }> = ({ title, value, icon: Icon }) => (
  <Card className="flex-1 min-w-[120px]">
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
      <div className="flex flex-col items-center justify-center p-6 min-h-[250px] text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-md text-muted-foreground">Fetching analytics for "{campaignName}"...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center min-h-[250px]">
        <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
        <p className="text-md text-destructive font-semibold mb-2">Error Fetching Analytics</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">Try Again</Button>
        )}
      </div>
    );
  }

  if (!analytics || (analytics.totalUsers === 0 && analytics.sessions === 0)) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground min-h-[250px] flex items-center justify-center">
        No analytics data found for the campaign "{campaignName}" in the last 90 days.
      </div>
    );
  }
  
  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}m ${sec}s`;
  };

  return (
    <div className="space-y-4 p-2">
      <div className="flex flex-wrap gap-4">
        <StatCard title="Total Users" value={analytics.totalUsers.toLocaleString()} icon={Users} />
        <StatCard title="Sessions" value={analytics.sessions.toLocaleString()} icon={BarChart2} />
        <StatCard title="Conversions" value={analytics.conversions.toLocaleString()} icon={CheckCircle} />
      </div>
       <div className="flex flex-wrap gap-4">
        <StatCard title="Bounce Rate" value={`${(analytics.bounceRate * 100).toFixed(2)}%`} icon={Percent} />
        <StatCard title="Avg. Session" value={formatDuration(analytics.averageSessionDuration)} icon={Timer} />
      </div>
      <p className="text-xs text-muted-foreground text-center pt-2">Data from the last 90 days.</p>
    </div>
  );
};

export default GaAnalyticsDisplay;
