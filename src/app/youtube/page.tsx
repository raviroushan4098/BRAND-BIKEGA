
import AppLayout from '@/components/layout/AppLayout';
import YouTubeCard from '@/components/analytics/YouTubeCard';
import { mockYouTubeData, type YouTubeVideo } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BarChart3 } from 'lucide-react';

// This page could be client-side for filtering/sorting, or server-side if data is fetched.
// For now, it's a server component using mock data.

export default function YouTubeAnalyticsPage() {
  const videos: YouTubeVideo[] = mockYouTubeData;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold">YouTube Analytics</CardTitle>
              </div>
              {/* Placeholder for filters or date pickers */}
              {/* <Input placeholder="Search videos..." className="max-w-sm" /> */}
            </div>
            <CardDescription>
              Overview of your YouTube video performance.
            </CardDescription>
          </CardHeader>
        </Card>

        {videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <YouTubeCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No YouTube data available yet.</p>
              <p className="text-sm text-muted-foreground">Connect your YouTube channel to see analytics.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
