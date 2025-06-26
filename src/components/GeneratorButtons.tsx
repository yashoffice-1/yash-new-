
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

type GeneratorType = 'image' | 'video' | 'content' | 'combo';

interface GeneratorButtonsProps {
  approvedInstruction: string | null;
  selectedImage: string | null;
  onGenerate: (type: GeneratorType) => void;
  isGenerating?: boolean;
}

const GENERATION_COSTS = {
  image: 0.02,
  video: 0.15,
  content: 0.01,
  combo: 0.18
};

const GENERATOR_INFO = {
  image: {
    title: "Generate Image",
    description: "Create a new image based on your instruction",
    provider: "RunwayML"
  },
  video: {
    title: "Generate Video", 
    description: "Create a short video from your selected image",
    provider: "RunwayML / HeyGen"
  },
  content: {
    title: "Generate Content",
    description: "Create marketing copy and captions",
    provider: "OpenAI"
  },
  combo: {
    title: "Generate Combo",
    description: "Create image + video + content package",
    provider: "All APIs"
  }
};

export function GeneratorButtons({ approvedInstruction, selectedImage, onGenerate, isGenerating = false }: GeneratorButtonsProps) {
  const [showCostPreview, setShowCostPreview] = useState(false);
  const [selectedGenerator, setSelectedGenerator] = useState<GeneratorType | null>(null);

  const handleGeneratorClick = (type: GeneratorType) => {
    setSelectedGenerator(type);
    setShowCostPreview(true);
  };

  const handleConfirmGeneration = () => {
    if (selectedGenerator) {
      onGenerate(selectedGenerator);
      setShowCostPreview(false);
      setSelectedGenerator(null);
    }
  };

  const isEnabled = approvedInstruction && selectedImage && !isGenerating;

  if (!approvedInstruction || !selectedImage) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle>Step 3: Generate Content</CardTitle>
          <CardDescription>Complete the previous steps to enable generators</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Step 3: Generate Content</CardTitle>
          <CardDescription>Choose what type of content to generate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(GENERATOR_INFO) as GeneratorType[]).map((type) => (
              <Button
                key={type}
                variant="outline"
                className="h-24 flex flex-col items-center justify-center space-y-2 hover:bg-primary hover:text-primary-foreground"
                onClick={() => handleGeneratorClick(type)}
                disabled={!isEnabled}
              >
                {isGenerating && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <div className="font-medium">{GENERATOR_INFO[type].title}</div>
                <div className="text-xs text-center">{GENERATOR_INFO[type].description}</div>
                <div className="text-xs opacity-70">${GENERATION_COSTS[type].toFixed(2)}</div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCostPreview} onOpenChange={setShowCostPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cost Preview</DialogTitle>
            <DialogDescription>
              Review the generation details and cost before proceeding
            </DialogDescription>
          </DialogHeader>
          
          {selectedGenerator && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium">{GENERATOR_INFO[selectedGenerator].title}</h4>
                <p className="text-sm text-muted-foreground">{GENERATOR_INFO[selectedGenerator].description}</p>
                <p className="text-xs">Provider: {GENERATOR_INFO[selectedGenerator].provider}</p>
              </div>
              
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Generation Cost</h4>
                <p className="text-2xl font-bold">${GENERATION_COSTS[selectedGenerator].toFixed(2)}</p>
              </div>
              
              <div className="border rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Your Instruction</h4>
                <p className="text-sm">{approvedInstruction}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCostPreview(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmGeneration} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Confirm & Generate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
