
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Youtube, Instagram, Lightbulb, Users, BarChart3, MessageSquareQuote } from 'lucide-react';
import Image from 'next/image';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8 shadow-xl bg-gradient-to-r from-primary to-accent text-primary-foreground overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-4xl font-bold">Welcome to Brand Dikhega!</CardTitle>
            <CardDescription className="text-lg text-primary-foreground/80">
              Your central hub for social media analytics and content strategy, powered by Insight Stream.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-base max-w-2xl mb-6 md:mb-0">
              Navigate through your YouTube and Instagram performance, discover AI-powered suggestions to boost your engagement, and manage user access all in one place. Let's unlock your content's full potential!
            </p>
            <Image 
              src="https://placehold.co/300x200.png" 
              alt="Data analytics illustration"
              width={300}
              height={200}
              className="rounded-lg shadow-md object-cover"
              data-ai-hint="analytics illustration"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8 text-primary" />}
            title="Track Performance"
            description="Monitor key metrics for your YouTube and Instagram channels. Understand what resonates with your audience."
            link="/youtube"
            linkLabel="View Analytics"
          />
          <FeatureCard
            icon={<MessageSquareQuote className="h-8 w-8 text-accent" />}
            title="AI Content Suggestions"
            description="Leverage AI to get personalized recommendations for improving your content and engagement."
            link="/suggestions"
            linkLabel="Get Suggestions"
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-secondary-foreground" />}
            title="User Management"
            description="Admins can easily manage user access and assign specific channels for tracking."
            link="/admin/users"
            linkLabel="Manage Users"
            adminOnly
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickLinkButton href="/youtube" icon={<Youtube />} label="YouTube" />
            <QuickLinkButton href="/instagram" icon={<Instagram />} label="Instagram" />
            <QuickLinkButton href="/suggestions" icon={<Lightbulb />} label="Suggestions" />
            <QuickLinkButton href="/admin/users" icon={<Users />} label="Admin" adminOnly />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  linkLabel: string;
  adminOnly?: boolean;
}

const FeatureCard = ({ icon, title, description, link, linkLabel }: FeatureCardProps) => (
  <Card className="hover:shadow-lg transition-shadow duration-300">
    <CardHeader className="flex flex-row items-center gap-4 pb-2">
      {icon}
      <CardTitle className="text-xl">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <Button asChild variant="outline">
        <Link href={link}>{linkLabel}</Link>
      </Button>
    </CardContent>
  </Card>
);

interface QuickLinkButtonProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
}

const QuickLinkButton = ({ href, icon, label }: QuickLinkButtonProps) => (
  <Button asChild variant="secondary" className="flex flex-col items-center justify-center h-24 text-center p-2">
    <Link href={href}>
      <div className="mb-1">{icon}</div>
      <span className="text-xs sm:text-sm">{label}</span>
    </Link>
  </Button>
);
