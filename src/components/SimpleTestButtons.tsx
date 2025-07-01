
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap } from "lucide-react";

type GeneratorType = 'image' | 'video' | 'content' | 'combo';

interface GeneratedAsset {
  id: string;
  type: GeneratorType;
  url: string;
  instruction: string;
  timestamp: Date;
  source_system?: string;
  content?: string;
  status?: string;
  runway_task_id?: string;
  message?: string;
}

interface SimpleTestButtonsProps {
  onAssetGenerated?: (asset: GeneratedAsset) => void;
  onGeneratingChange?: (isGenerating: boolean) => void;
}

export function SimpleTestButtons({ onAssetGenerated, onGeneratingChange }: SimpleTestButtonsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<string>("");
  const [isTestingZapier, setIsTestingZapier] = useState(false);
  const { toast } = useToast();

  const testZapierWebhook = async () => {
    setIsTestingZapier(true);
    
    try {
      console.log('Testing Zapier webhook integration');
      
      const { data, error } = await supabase.functions.invoke('heygen-generate', {
        body: {
          instruction: "Create a professional product video showcasing wireless headphones with smooth transitions and modern aesthetics",
          imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
          productInfo: {
            name: "Premium Wireless Headphones - TEST",
            description: "High-quality audio experience with noise cancellation - TEST PRODUCT"
          }
        }
      });

      console.log('Zapier test response:', data);

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast({
          title: "Zapier Test Successful",
          description: `Test data sent to Zapier. Request ID: ${data.request_id}`,
        });

        // Show the data that was sent
        console.log('Data sent to Zapier:', data.webhook_data);
        
        toast({
          title: "Check Your Zapier Dashboard",
          description: "The test request should now appear in your Zap's history. Use this data structure to configure your Zap.",
        });

      } else {
        throw new Error(data.error || 'Failed to test Zapier webhook');
      }

    } catch (error) {
      console.error('Error testing Zapier webhook:', error);
      toast({
        title: "Zapier Test Failed",
        description: error.message || "Failed to test Zapier webhook integration.",
        variant: "destructive",
      });
    } finally {
      setIsTestingZapier(false);
    }
  };

  const testGeneration = async (type: 'image' | 'video') => {
    setIsGenerating(true);
    setGenerationType(type);
    onGeneratingChange?.(true);
    
    const testInstruction = type === 'image' 
      ? "A sleek pair of wireless headphones on a white background, professional product photography"
      : "A smooth 360-degree rotation of wireless headphones showcasing the design";

    try {
      console.log(`Testing ${type} generation with RunwayML`);
      
      const { data, error } = await supabase.functions.invoke('runwayml-generate', {
        body: {
          type: type,
          instruction: testInstruction,
          imageUrl: type === 'video' ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop' : undefined,
          productInfo: {
            name: "Premium Wireless Headphones",
            description: "High-quality audio experience with noise cancellation"
          }
        }
      });

      console.log(`${type} generation response:`, data);

      if (error) {
        throw new Error(error.message);
      }

      if (data.success || data.asset_url) {
        toast({
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Generation Test`,
          description: data.message || `${type} generated successfully!`,
          variant: data.status === 'error' ? 'destructive' : 'default'
        });

        // Create asset object and pass to parent
        if (data.asset_url && onAssetGenerated) {
          const asset: GeneratedAsset = {
            id: data.asset_id || `${type}-${Date.now()}`,
            type: type,
            url: data.asset_url,
            instruction: testInstruction,
            timestamp: new Date(),
            source_system: 'runway',
            status: data.status,
            runway_task_id: data.runway_task_id,
            message: data.message
          };
          
          onAssetGenerated(asset);
          console.log(`Generated ${type} URL:`, data.asset_url);
        }
      } else {
        throw new Error(data.error || `Failed to generate ${type}`);
      }

    } catch (error) {
      console.error(`Error testing ${type} generation:`, error);
      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Test Failed`,
        description: error.message || `Failed to test ${type} generation.`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationType("");
      onGeneratingChange?.(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Zapier Test Button */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <span>Zapier Integration Test</span>
          </CardTitle>
          <CardDescription>
            Test your Zapier webhook integration and see the exact data structure sent to configure your Zap
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={testZapierWebhook}
            disabled={isTestingZapier}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isTestingZapier && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Send Test Data to Zapier
          </Button>
          
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <h4 className="font-medium mb-2">Expected Data Structure:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`{
  "timestamp": "2025-01-01T12:00:00.000Z",
  "instruction": "Create a professional product video...",
  "product_name": "Premium Wireless Headphones - TEST",
  "product_description": "High-quality audio experience...",
  "image_url": "https://images.unsplash.com/photo-...",
  "status": "pending",
  "source": "feedgenerator_app",
  "request_id": "uuid-string"
}`}
            </pre>
            <p className="text-sm text-gray-600 mt-2">
              Configure your Zap to use these fields for Google Sheets columns and HeyGen API calls.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* RunwayML Test Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>RunwayML Integration Test</CardTitle>
          <CardDescription>
            Simple test buttons to verify RunwayML API integration is working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => testGeneration('image')}
              disabled={isGenerating}
              className="h-24 flex flex-col items-center justify-center space-y-2"
              variant="outline"
            >
              {isGenerating && generationType === 'image' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <div className="font-medium">Test Image Generation</div>
              <div className="text-xs text-center">
                Generate a product image using RunwayML
              </div>
            </Button>

            <Button
              onClick={() => testGeneration('video')}
              disabled={isGenerating}
              className="h-24 flex flex-col items-center justify-center space-y-2"
              variant="outline"
            >
              {isGenerating && generationType === 'video' && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <div className="font-medium">Test Video Generation</div>
              <div className="text-xs text-center">
                Generate a product video using RunwayML
              </div>
            </Button>
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Test Instructions:</h4>
            <div className="text-sm space-y-1">
              <p><strong>Image:</strong> "A sleek pair of wireless headphones on a white background, professional product photography"</p>
              <p><strong>Video:</strong> "A smooth 360-degree rotation of wireless headphones showcasing the design"</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Generated assets will be displayed in the assets section below and may take a few moments to process.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
