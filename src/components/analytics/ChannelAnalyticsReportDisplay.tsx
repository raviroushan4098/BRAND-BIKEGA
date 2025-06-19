
"use client";

import type { ChannelAnalyticsReportOutput, YouTubeVideoForReport } from '@/ai/flows/generate-channel-analytics-report-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Lightbulb, ListChecks, BarChartBig, Star, YoutubeIcon, Download, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import PptxGenJS from 'pptxgenjs';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const handleDownloadPptReport = () => {
    if (!report) {
      toast({ title: "Error", description: "No report data to download.", variant: "destructive" });
      return;
    }

    toast({ title: "Generating PPT", description: "Your PowerPoint report is being generated...", duration: 5000});

    try {
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE"; // 16x9 aspect ratio

      // Theme Colors (aligning with app's theme)
      const primaryColor = "3F51B5"; // Deep Blue
      const accentColor = "9C27B0"; // Purple
      const textColor = "212121"; // Dark Gray (for light slides)
      const slideBackgroundColor = "FFFFFF";

      // Slide Master (Optional, for consistent branding)
      pptx.defineSlideMaster({
        title: "MASTER_SLIDE",
        background: { color: slideBackgroundColor },
        objects: [
          { rect: { x: 0, y: 0, w: "100%", h: 0.75, fill: { color: primaryColor } } },
          { text: { text: "Insight Stream Analytics", options: { x: 0.5, y: 0.15, w: 5, h: 0.5, color: "FFFFFF", fontSize: 18 } } },
        ],
      });
      
      // Helper function for adding a standard content slide
      const addContentSlide = (slideTitle: string, content?: PptxGenJS.TextProps[]) => {
        const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
        slide.addText(slideTitle, { x: 0.5, y: 1.0, w: "90%", h: 0.5, fontSize: 28, bold: true, color: primaryColor });
        if (content && content.length > 0) {
           slide.addText(content, { x: 0.5, y: 1.75, w: "90%", h: 4.5, fontSize: 12, color: textColor, bullet: {type: 'bullet'} });
        } else if (typeof content === 'string') {
           slide.addText(content, { x: 0.5, y: 1.75, w: "90%", h: 4.5, fontSize: 12, color: textColor });
        }
        return slide;
      };


      // Title Slide
      const titleSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
      titleSlide.addText(report.reportTitle || "Channel Analytics Report", {
        x: 0.5, y: 2.5, w: '90%', h: 1.5, fontSize: 44, bold: true, color: primaryColor, align: 'center',
      });
      titleSlide.addText(`Generated on: ${new Date().toLocaleDateString()}`, {
        x: 0.5, y: 4.0, w: '90%', h: 0.5, fontSize: 16, color: textColor, align: 'center',
      });


      // Overall Performance Summary Slide
      addContentSlide("Overall Performance Summary", [{text: report.overallPerformanceSummary, options: {fontSize: 16}}]);

      // Key Observations Slide
      if (report.keyObservations && report.keyObservations.length > 0) {
        addContentSlide("Key Observations", report.keyObservations.map(obs => ({ text: obs, options: { breakLine: true, fontSize: 14 } })));
      }

      // Top Performing Videos Slide
      if (report.topPerformingVideos && report.topPerformingVideos.length > 0) {
        const topVideosSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
        topVideosSlide.addText("Top Performing Videos", { x: 0.5, y: 1.0, w: "90%", h: 0.5, fontSize: 28, bold: true, color: primaryColor });
        
        let yPos = 1.75;
        report.topPerformingVideos.forEach((video, index) => {
          if (yPos > 5.0 && index < report.topPerformingVideos.length -1 ) { // check if space left for next video
             // pptx.addSlide({ masterName: "MASTER_SLIDE" }); // New slide if needed
             // yPos = 1.0;
             // Not adding new slide for brevity here, but in a real case, check for overflow
          }
          topVideosSlide.addText(`${index + 1}. ${video.title}`, { x: 0.5, y: yPos, w: "90%", h: 0.3, fontSize: 16, bold: true, color: accentColor, hyperlink: { url: `https://www.youtube.com/watch?v=${video.id}`, tooltip: "Watch Video" } });
          yPos += 0.35;
          topVideosSlide.addText(
            `Views: ${video.views.toLocaleString()} | Likes: ${video.likes.toLocaleString()} | Comments: ${video.comments.toLocaleString()}`,
            { x: 0.7, y: yPos, w: "85%", h: 0.25, fontSize: 12, color: textColor }
          );
          yPos += 0.25;
          if (video.reason) {
            topVideosSlide.addText(`Reason: ${video.reason}`, { x: 0.7, y: yPos, w: "85%", h: 0.25, fontSize: 12, italic: true, color: textColor });
            yPos += 0.25;
          }
          yPos += 0.2; // Spacing
        });
      }
      
      // Areas for Improvement Slide
      if (report.areasForImprovement && report.areasForImprovement.length > 0) {
         addContentSlide("Areas for Improvement", report.areasForImprovement.map(area => ({ text: area, options: { breakLine: true, fontSize: 14 } })));
      }

      // Actionable Suggestions Slide
      if (report.actionableSuggestions && report.actionableSuggestions.length > 0) {
        addContentSlide("Actionable Suggestions", report.actionableSuggestions.map(suggestion => ({ text: suggestion, options: { breakLine: true, fontSize: 14 } })));
      }

      // Thank You / End Slide
      const endSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
      endSlide.addText("Thank You", { x:0.5, y:2.5, w:'90%', h:1, fontSize:40, bold:true, color:primaryColor, align:'center'});
      endSlide.addText("Report generated by Insight Stream", { x:0.5, y:3.5, w:'90%', h:0.5, fontSize:14, color:textColor, align:'center'});


      const reportTitleForFile = report.reportTitle ? report.reportTitle.replace(/[^a-z0-9_]/gi, '_').toLowerCase() : 'channel_analytics_report';
      pptx.writeFile({ fileName: `${reportTitleForFile}.pptx` });

    } catch (e: any) {
       console.error("Error generating PPT:", e);
       toast({ title: "PPT Generation Failed", description: e.message || "Could not generate PowerPoint file.", variant: "destructive"});
    }
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
          <Button onClick={handleDownloadPptReport} variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> {/* Changed Icon */}
            Download as PPT
          </Button>
          {onRegenerate && (
            <Button onClick={onRegenerate} variant="outline">Regenerate Report</Button>
          )}
      </CardFooter>
    </div>
  );
};

export default ChannelAnalyticsReportDisplay;
