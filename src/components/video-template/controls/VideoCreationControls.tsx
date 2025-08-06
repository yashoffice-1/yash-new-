
import { Button } from "@/components/ui/forms/button";
import { Send, Loader2 } from "lucide-react";

interface VideoCreationControlsProps {
  selectedTemplate: string;
  isGenerating: boolean;
  areAllVariablesChecked: boolean;
  checkedCount: number;
  totalVariables: number;
  onSendToCreateVideo: () => void;
}

export function VideoCreationControls({
  selectedTemplate,
  isGenerating,
  areAllVariablesChecked,
  checkedCount,
  totalVariables,
  onSendToCreateVideo
}: VideoCreationControlsProps) {
  if (!selectedTemplate) {
    return null;
  }

  return (
    <div className="flex justify-center pt-6">
      <Button
        onClick={onSendToCreateVideo}
        disabled={isGenerating || !areAllVariablesChecked}
        className={`px-8 py-3 text-base ${areAllVariablesChecked ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'}`}
        size="lg"
      >
{isGenerating ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        {isGenerating ? "Generating Video..." : 
         areAllVariablesChecked ? "Send to Make Video" : 
         `Complete All Variables (${checkedCount}/${totalVariables})`}
      </Button>
    </div>
  );
}
