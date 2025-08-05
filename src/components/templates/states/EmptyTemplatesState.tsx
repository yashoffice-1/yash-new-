
import { Button } from "@/components/ui/button";
import { Video, Settings, Plus } from "lucide-react";

interface EmptyTemplatesStateProps {
  onOpenOnboarding: () => void;
  onRequestTemplate: () => void;
}

export function EmptyTemplatesState({ onOpenOnboarding, onRequestTemplate }: EmptyTemplatesStateProps) {
  return (
    <div className="text-center py-12">
      <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Available</h3>
      <p className="text-gray-500 mb-6">
        You don't have any video templates assigned yet. Get started by completing your brand onboarding or requesting a custom template.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={onOpenOnboarding}
          className="flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>Complete Brand Onboarding</span>
        </Button>
        <Button
          variant="outline"
          onClick={onRequestTemplate}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Request Custom Template</span>
        </Button>
      </div>
    </div>
  );
}
