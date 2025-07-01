
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Sparkles } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  brand: string | null;
}

interface VideoGeneratorProps {
  selectedProducts: InventoryItem[];
  instruction: string;
  setInstruction: (instruction: string) => void;
  onGenerate: (type: 'video') => void;
}

export function VideoGenerator({ 
  selectedProducts, 
  instruction, 
  setInstruction, 
  onGenerate 
}: VideoGeneratorProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="h-5 w-5" />
            <span>Video Generation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="video-instruction">Generation Instructions</Label>
            <Textarea
              id="video-instruction"
              placeholder="Describe the type of video you want to generate..."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={4}
            />
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Selected Products ({selectedProducts.length})</h4>
            <div className="space-y-1">
              {selectedProducts.map((product) => (
                <div key={product.id} className="text-sm text-muted-foreground">
                  • {product.name} {product.brand && `(${product.brand})`}
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={() => onGenerate('video')} 
            className="w-full"
            disabled={!instruction.trim() || selectedProducts.length === 0}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Videos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
