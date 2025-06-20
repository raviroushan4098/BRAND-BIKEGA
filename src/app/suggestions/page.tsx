
import AppLayout from '@/components/layout/AppLayout';
import ContentSuggestionForm from '@/components/ai/ContentSuggestionForm'; // This component will be heavily modified

export default function SuggestionsPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6 flex justify-center items-start">
        {/* The form itself will now manage the full width and height */}
        <ContentSuggestionForm />
      </div>
    </AppLayout>
  );
}
