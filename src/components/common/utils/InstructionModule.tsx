
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/forms/button";
import { Textarea } from "@/components/ui/forms/textarea";
import { useToast } from "@/hooks/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InstructionModuleProps {
  onInstructionApproved: (instruction: string) => void;
  selectedImage: string | null;
}

export function InstructionModule({ onInstructionApproved, selectedImage }: InstructionModuleProps) {
  const [rawInstruction, setRawInstruction] = useState("");
  const [cleanedInstruction, setCleanedInstruction] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const { toast } = useToast();

  const handleCleanInstruction = async () => {
    if (!rawInstruction.trim()) {
      toast({
        title: "Error",
        description: "Please enter an instruction first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('openai-generate', {
        body: {
          type: 'clean-instruction',
          instruction: rawInstruction.trim(),
          productInfo: {
            name: "Premium Wireless Headphones",
            description: "High-quality audio experience with noise cancellation"
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to clean instruction');
      }

      setCleanedInstruction(data.result);
      toast({
        title: "Instruction Cleaned",
        description: "Your instruction has been optimized for better AI generation.",
      });
    } catch (error) {
      console.error('Error cleaning instruction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to clean instruction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = () => {
    setIsApproved(true);
    onInstructionApproved(cleanedInstruction);
    toast({
      title: "Instruction Approved",
      description: "You can now proceed to generate content.",
    });
  };

  if (!selectedImage) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle>Step 2: Provide Instruction</CardTitle>
          <CardDescription>Please select an image first</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Provide Instruction</CardTitle>
        <CardDescription>
          Tell us what kind of content you'd like to generate from the selected image
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Instruction:</label>
          <Textarea
            placeholder="e.g., Create a social media post highlighting the comfort and style of these headphones for young professionals..."
            value={rawInstruction}
            onChange={(e) => setRawInstruction(e.target.value)}
            rows={3}
          />
          <Button 
            onClick={handleCleanInstruction}
            disabled={isProcessing || !rawInstruction.trim()}
            className="w-full"
          >
            {isProcessing ? "Cleaning Instruction..." : "Clean & Optimize Instruction"}
          </Button>
        </div>

        {cleanedInstruction && (
          <div className="space-y-2 p-4 border rounded-lg bg-blue-50">
            <label className="text-sm font-medium">Optimized Instruction:</label>
            <Textarea
              value={cleanedInstruction}
              onChange={(e) => setCleanedInstruction(e.target.value)}
              rows={3}
              className="bg-white"
            />
            <div className="flex space-x-2">
              <Button 
                onClick={handleApprove}
                disabled={isApproved}
                className="flex-1"
              >
                {isApproved ? "Approved ✓" : "Approve Instruction"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setCleanedInstruction("")}
                className="flex-1"
              >
                Edit Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
