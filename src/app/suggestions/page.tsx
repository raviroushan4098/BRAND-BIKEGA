
import AppLayout from '@/components/layout/AppLayout';
import ContentSuggestionForm from '@/components/ai/ContentSuggestionForm';

export default function SuggestionsPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <ContentSuggestionForm />
      </div>
    </AppLayout>
  );
}
