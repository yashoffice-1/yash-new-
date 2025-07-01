
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap } from "lucide-react";

export function ZapierTestSection() {
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

  return (
    <Card className="border-blue-200 bg-blue-50 mb-6">
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
          className="w-full bg-blue-600 hover:bg-blue-700 mb-4"
        >
          {isTestingZapier && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Send Test Data to Zapier
        </Button>
        
        <div className="p-4 bg-white rounded-lg border">
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
  );
}
