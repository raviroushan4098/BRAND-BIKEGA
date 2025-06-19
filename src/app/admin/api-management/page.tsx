
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyRound, Settings2, BarChartHorizontalBig, AlertTriangle } from 'lucide-react';

export default function ApiManagementPage() {
  return (
    <AppLayout adminOnly={true}>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KeyRound className="h-8 w-8 text-primary" />
                <CardTitle className="text-3xl font-bold">API Management System</CardTitle>
              </div>
              {/* Placeholder for future actions like "Generate New Key" */}
              {/* <Button size="lg" disabled>
                <PlusCircle className="mr-2 h-5 w-5" /> Generate New API Key
              </Button> */}
            </div>
            <CardDescription>
              Manage API keys, access controls, and usage quotas for external services or integrations.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings2 className="h-6 w-6 text-accent" />
                <CardTitle>API Key Configuration</CardTitle>
              </div>
              <CardDescription>View, generate, and revoke API keys.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                API keys are used to authenticate requests to your application's API endpoints.
                Ensure keys are kept secure and rotated regularly.
              </p>
              <div className="p-4 border rounded-md bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">API Key management interface will be here.</p>
                <Button variant="outline" className="mt-4" disabled>
                  Manage Keys (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <BarChartHorizontalBig className="h-6 w-6 text-secondary-foreground" />
                <CardTitle>Usage & Quotas</CardTitle>
              </div>
              <CardDescription>Monitor API usage and set rate limits or quotas.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Track API call volume and manage quotas to prevent abuse and ensure fair usage.
              </p>
              <div className="p-4 border rounded-md bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">API usage monitoring and quota settings will be here.</p>
                 <Button variant="outline" className="mt-4" disabled>
                  View Usage (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <CardTitle>Security Considerations</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>API keys grant access to your application; treat them like passwords.</li>
                    <li>Do not embed API keys directly in client-side code if they are sensitive.</li>
                    <li>Implement proper authorization and authentication for all API endpoints.</li>
                    <li>Regularly audit API key usage and permissions.</li>
                </ul>
            </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
