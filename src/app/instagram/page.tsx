
import AppLayout from '@/components/layout/AppLayout';
import InstagramCard from '@/components/analytics/InstagramCard';
import { mockInstagramData, type InstagramPost } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

// This page could be client-side for filtering/sorting, or server-side if data is fetched.
// For now, it's a server component using mock data.

export default function InstagramAnalyticsPage() {
  const posts: InstagramPost[] = mockInstagramData;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8 shadow-lg">
          <CardHeader>
             <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold">Instagram Analytics</CardTitle>
              </div>
              {/* Placeholder for filters or date pickers */}
            </div>
            <CardDescription>
              Insights into your Instagram post performance.
            </CardDescription>
          </CardHeader>
        </Card>

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {posts.map((post) => (
              <InstagramCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
           <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No Instagram data available yet.</p>
              <p className="text-sm text-muted-foreground">Connect your Instagram account to see analytics.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

