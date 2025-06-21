import AppLayout from '@/components/layout/AppLayout';
import UtmTrackerClient from '@/components/analytics/UtmTrackerClient';

export default function UtmTrackerPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <UtmTrackerClient />
      </div>
    </AppLayout>
  );
}
