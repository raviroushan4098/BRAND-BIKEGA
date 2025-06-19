
"use client";

import type { ChannelAnalyticsReportOutput, YouTubeVideoForReport } from '@/ai/flows/generate-channel-analytics-report-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Lightbulb, ListChecks, BarChartBig, Star, YoutubeIcon, Download } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ChannelAnalyticsReportDisplayProps {
  report: ChannelAnalyticsReportOutput | null;
  isLoading: boolean;
  error: string | null;
  onRegenerate?: () => void;
}

const SectionCard: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode; className?: string }> = ({ title, icon: Icon, children, className }) => (
  <Card className={cn("shadow-md", className)}>
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-primary" />
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground">
      {children}
    </CardContent>
  </Card>
);

const ChannelAnalyticsReportDisplay: React.FC<ChannelAnalyticsReportDisplayProps> = ({ report, isLoading, error, onRegenerate }) => {
  
  const handleDownloadReport = () => {
    if (!report) return;

    let markdownContent = `# ${report.reportTitle || "Channel Analytics Report"}\n\n`;
    markdownContent += `## Overall Performance Summary\n${report.overallPerformanceSummary}\n\n`;

    markdownContent += `## Key Observations\n`;
    if (report.keyObservations.length > 0) {
      report.keyObservations.forEach(obs => markdownContent += `- ${obs}\n`);
    } else {
      markdownContent += `No specific key observations noted.\n`;
    }
    markdownContent += `\n`;

    markdownContent += `## Top Performing Videos\n`;
    if (report.topPerformingVideos.length > 0) {
      report.topPerformingVideos.forEach(video => {
        markdownContent += `### [${video.title}](https://www.youtube.com/watch?v=${video.id})\n`;
        markdownContent += `- Views: ${video.views.toLocaleString()}\n`;
        markdownContent += `- Likes: ${video.likes.toLocaleString()}\n`;
        markdownContent += `- Comments: ${video.comments.toLocaleString()}\n`;
        if (video.reason) {
          markdownContent += `- Reason: ${video.reason}\n`;
        }
        markdownContent += `\n`;
      });
    } else {
      markdownContent += `Could not identify distinct top-performing videos.\n\n`;
    }

    markdownContent += `## Areas for Improvement\n`;
    if (report.areasForImprovement.length > 0) {
      report.areasForImprovement.forEach(area => markdownContent += `- ${area}\n`);
    } else {
      markdownContent += `No specific areas for improvement highlighted.\n`;
    }
    markdownContent += `\n`;

    markdownContent += `## Actionable Suggestions\n`;
    if (report.actionableSuggestions.length > 0) {
      report.actionableSuggestions.forEach(suggestion => markdownContent += `- ${suggestion}\n`);
    } else {
      markdownContent += `No specific actionable suggestions provided.\n`;
    }
    markdownContent += `\n`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const reportTitleForFile = report.reportTitle ? report.reportTitle.replace(/[^a-z0-9_]/gi, '_').toLowerCase() : 'channel_analytics_report';
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportTitleForFile}.md`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[400px] text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-xl text-muted-foreground font-semibold">Generating Channel Report...</p>
        <p className="text-md text-muted-foreground">The AI is analyzing your video data. This might take a few moments.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[400px] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
        <p className="text-xl text-destructive font-semibold mb-2">Error Generating Report</p>
        <p className="text-md text-muted-foreground mb-4">{error}</p>
        {onRegenerate && (
          <Button onClick={onRegenerate} variant="outline">Try Generating Again</Button>
        )}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center text-md text-muted-foreground min-h-[400px] flex items-center justify-center">
        No report data available. Click "Generate Report" to start.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
             <BarChartBig className="h-8 w-8 text-primary" />
             <CardTitle className="text-2xl md:text-3xl font-bold text-primary">{report.reportTitle || "Channel Analytics Report"}</CardTitle>
          </div>
          <CardDescription className="text-base text-muted-foreground">{report.overallPerformanceSummary}</CardDescription>
        </CardHeader>
      </Card>

      <SectionCard title="Key Observations" icon={ListChecks}>
        {report.keyObservations.length > 0 ? (
          <ul className="space-y-2 list-disc pl-5">
            {report.keyObservations.map((obs, index) => <li key={index}>{obs}</li>)}
          </ul>
        ) : <p>No specific key observations noted by the AI.</p>}
      </SectionCard>

      <SectionCard title="Top Performing Videos" icon={Star}>
        {report.topPerformingVideos.length > 0 ? (
          <div className="space-y-4">
            {report.topPerformingVideos.map(video => (
              <Card key={video.id} className="p-3 bg-card hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <Link href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline text-sm">
                      {video.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Views: {video.views.toLocaleString()} | Likes: {video.likes.toLocaleString()} | Comments: {video.comments.toLocaleString()}
                    </p>
                  </div>
                   <Button asChild variant="ghost" size="sm" className="text-xs shrink-0 ml-2">
                       <Link href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">
                           <YoutubeIcon className="h-3.5 w-3.5 mr-1"/> Open
                       </Link>
                   </Button>
                </div>
                {video.reason && <p className="text-xs italic text-muted-foreground/80 mt-1">Reason: {video.reason}</p>}
              </Card>
            ))}
          </div>
        ) : <p>Could not identify distinct top-performing videos from this dataset.</p>}
      </SectionCard>
      
      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title="Areas for Improvement" icon={TrendingDown} className="border-destructive/30">
          {report.areasForImprovement.length > 0 ? (
            <ul className="space-y-2 list-disc pl-5">
              {report.areasForImprovement.map((area, index) => <li key={index}>{area}</li>)}
            </ul>
          ) : <p>No specific areas for improvement highlighted by the AI.</p>}
        </SectionCard>

        <SectionCard title="Actionable Suggestions" icon={Lightbulb} className="border-green-500/30">
          {report.actionableSuggestions.length > 0 ? (
            <ul className="space-y-2 list-disc pl-5">
              {report.actionableSuggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}
            </ul>
          ) : <p>No specific actionable suggestions provided by the AI at this time.</p>}
        </SectionCard>
      </div>
      <CardFooter className="mt-4 justify-end gap-2">
          <Button onClick={handleDownloadReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
          {onRegenerate && (
            <Button onClick={onRegenerate} variant="outline">Regenerate Report</Button>
          )}
      </CardFooter>
    </div>
  );
};

export default ChannelAnalyticsReportDisplay;
