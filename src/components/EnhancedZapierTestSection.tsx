
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { TemplateSelector } from "./TemplateSelector";
import { processProductForSpreadsheet, validateProcessedData } from "@/utils/productFieldProcessor";

interface TemplateConfig {
  id: string;
  name: string;
  webhookUrl: string;
  variables: string[];
  description?: string;
}

export function EnhancedZapierTestSection() {
  const [isTestingZapier, setIsTestingZapier] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig>();
  const [lastTestResult, setLastTestResult] = useState<any>(null);
  const { toast } = useToast();

  const testZapierWebhook = async () => {
    if (!selectedTemplate) {
      toast({
        title: "No Template Selected",
        description: "Please select a template configuration before testing.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingZapier(true);
    
    try {
      console.log('Testing Zapier webhook with template:', selectedTemplate);
      
      // Create test product data
      const testProduct = {
        name: "Premium Wireless Headphones - TEST",
        description: "Experience superior sound quality with our premium wireless headphones. Features advanced noise cancellation technology, comfortable over-ear design, and up to 30 hours of battery life. Perfect for music lovers and professionals who demand the best audio experience.",
        category: "Electronics & Audio",
        price: 199,
        discount: "15%"
      };

      // Process the product data with constraints
      const processedData = processProductForSpreadsheet({
        ...testProduct,
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"
      });

      // Validate the processed data
      const validation = validateProcessedData(processedData);
      
      console.log('Processed product data:', processedData);
      console.log('Field validation:', validation);

      const { data, error } = await supabase.functions.invoke('heygen-generate', {
        body: {
          instruction: "Create a professional product video showcasing wireless headphones with smooth transitions and modern aesthetics",
          imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
          productInfo: testProduct,
          templateConfig: selectedTemplate
        }
      });

      console.log('Zapier test response:', data);

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setLastTestResult(data);
        
        toast({
          title: "Zapier Test Successful",
          description: `Test data sent using "${selectedTemplate.name}" template. Request ID: ${data.request_id}`,
        });

        // Show validation results
        if (data.field_validation) {
          const validationResults = Object.entries(data.field_validation)
            .map(([field, isValid]) => `${field}: ${isValid ? '✅' : '❌'}`)
            .join('\n');
          
          console.log('Field validation results:', validationResults);
        }

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
    <div className="space-y-6">
      <TemplateSelector 
        onTemplateSelect={setSelectedTemplate}
        selectedTemplate={selectedTemplate}
      />

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <span>Enhanced Zapier Integration Test</span>
          </CardTitle>
          <CardDescription>
            Test your Zapier webhook with processed product data that matches Google Sheets column constraints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testZapierWebhook}
            disabled={isTestingZapier || !selectedTemplate}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isTestingZapier && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {selectedTemplate ? `Test with ${selectedTemplate.name}` : 'Select Template First'}
          </Button>
          
          {lastTestResult && (
            <div className="p-4 bg-white rounded-lg border space-y-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h4 className="font-medium">Last Test Results</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-sm mb-2">Field Validation Status:</h5>
                  {lastTestResult.field_validation && (
                    <div className="space-y-1">
                      {Object.entries(lastTestResult.field_validation).map(([field, isValid]) => (
                        <div key={field} className="flex items-center space-x-2 text-xs">
                          {isValid ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span className={isValid ? 'text-green-700' : 'text-red-700'}>
                            {field.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <h5 className="font-medium text-sm mb-2">Processed Data Sample:</h5>
                  {lastTestResult.processed_data && (
                    <div className="space-y-1 text-xs">
                      <div><strong>Product Name:</strong> {lastTestResult.processed_data.product_name} ({lastTestResult.processed_data.product_name.length}/81)</div>
                      <div><strong>Category:</strong> {lastTestResult.processed_data.category_name} ({lastTestResult.processed_data.category_name.length}/150)</div>
                      <div><strong>Feature 1:</strong> {lastTestResult.processed_data.feature_one} ({lastTestResult.processed_data.feature_one.length}/80)</div>
                      <div><strong>Description:</strong> {lastTestResult.processed_data.website_description} ({lastTestResult.processed_data.website_description.length}/22)</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-sm mb-2">Template Used:</h5>
                <p className="text-xs">{lastTestResult.template_used}</p>
                <p className="text-xs text-muted-foreground">Request ID: {lastTestResult.request_id}</p>
              </div>
            </div>
          )}
          
          <div className="p-4 bg-white rounded-lg border">
            <h4 className="font-medium mb-2">Field Constraints Applied:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <div><strong>Product Name:</strong> Max 81 characters</div>
                <div><strong>Category Name:</strong> Max 150 characters</div>
                <div><strong>Website Description:</strong> Max 22 characters</div>
              </div>
              <div>
                <div><strong>Feature One:</strong> Max 80 characters (AI extracted)</div>
                <div><strong>Feature Two:</strong> Max 80 characters (AI extracted)</div>
                <div><strong>Feature Three:</strong> Max 80 characters (AI extracted)</div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              All fields are processed and validated before sending to maintain video generation constraints.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
