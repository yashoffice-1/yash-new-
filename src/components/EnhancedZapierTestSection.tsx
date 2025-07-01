
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, CheckCircle, AlertCircle, Copy, Eye } from "lucide-react";
import { TemplateSelector } from "./TemplateSelector";
import { processProductForSpreadsheet, validateProcessedData } from "@/utils/productFieldProcessor";

interface TemplateConfig {
  id: string;
  name: string;
  webhookUrl: string;
  variables: string[];
  description?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  sku: string | null;
  category: string | null;
  brand: string | null;
  images: string[];
  metadata: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export function EnhancedZapierTestSection() {
  const [isTestingZapier, setIsTestingZapier] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig>();
  const [lastTestResult, setLastTestResult] = useState<any>(null);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);
  const { toast } = useToast();

  // Fetch a real product from inventory for testing
  const { data: testProduct, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['test-product'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching test product:', error);
        throw error;
      }
      
      return data as InventoryItem;
    },
  });

  const copyPayloadToClipboard = async () => {
    if (!testProduct || !selectedTemplate) return;
    
    const productForTest = {
      name: testProduct.name,
      description: testProduct.description || testProduct.name,
      category: testProduct.category || "General",
      price: testProduct.price || 0,
      discount: "10%",
      imageUrl: testProduct.images?.[0] || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"
    };

    const processedData = processProductForSpreadsheet(productForTest);
    
    const webhookPayload = {
      timestamp: new Date().toISOString(),
      instruction: `Create a professional product video showcasing ${testProduct.name} with smooth transitions and modern aesthetics`,
      status: "pending",
      source: "feedgenerator_app",
      request_id: crypto.randomUUID(),
      template_id: selectedTemplate.id,
      template_name: selectedTemplate.name,
      product_name: processedData.product_name,
      product_price: processedData.product_price,
      product_discount: processedData.product_discount,
      category_name: processedData.category_name,
      feature_one: processedData.feature_one,
      feature_two: processedData.feature_two,
      feature_three: processedData.feature_three,
      website_description: processedData.website_description,
      product_image: processedData.product_image
    };

    await navigator.clipboard.writeText(JSON.stringify(webhookPayload, null, 2));
    toast({
      title: "Payload Copied",
      description: "The webhook payload has been copied to your clipboard for testing in Zapier.",
    });
  };

  const testZapierWebhook = async () => {
    if (!selectedTemplate) {
      toast({
        title: "No Template Selected",
        description: "Please select a template configuration before testing.",
        variant: "destructive",
      });
      return;
    }

    if (!testProduct) {
      toast({
        title: "No Test Product Available",
        description: "No products found in inventory to use for testing.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingZapier(true);
    
    try {
      console.log('=== ZAPIER WEBHOOK TEST DEBUG ===');
      console.log('Testing Zapier webhook with template:', selectedTemplate);
      console.log('Using product from inventory:', testProduct);
      
      // Create test product data from real inventory item
      const productForTest = {
        name: testProduct.name,
        description: testProduct.description || testProduct.name,
        category: testProduct.category || "General",
        price: testProduct.price || 0,
        discount: "10%", // Default discount for test
        imageUrl: testProduct.images?.[0] || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"
      };

      // Process the product data with constraints
      const processedData = processProductForSpreadsheet(productForTest);

      // Validate the processed data
      const validation = validateProcessedData(processedData);
      
      console.log('=== DATA BEING SENT TO ZAPIER ===');
      console.log('Raw product data:', productForTest);
      console.log('Processed product data:', processedData);
      console.log('Field validation:', validation);
      console.log('Webhook URL:', selectedTemplate.webhookUrl);

      // Create the exact payload that will be sent
      const expectedPayload = {
        timestamp: new Date().toISOString(),
        instruction: `Create a professional product video showcasing ${testProduct.name} with smooth transitions and modern aesthetics`,
        status: "pending",
        source: "feedgenerator_app",
        request_id: crypto.randomUUID(),
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        product_name: processedData.product_name,
        product_price: processedData.product_price,
        product_discount: processedData.product_discount,
        category_name: processedData.category_name,
        feature_one: processedData.feature_one,
        feature_two: processedData.feature_two,
        feature_three: processedData.feature_three,
        website_description: processedData.website_description,
        product_image: processedData.product_image
      };

      console.log('=== EXPECTED WEBHOOK PAYLOAD ===');
      console.log(JSON.stringify(expectedPayload, null, 2));

      const { data, error } = await supabase.functions.invoke('heygen-generate', {
        body: {
          instruction: `Create a professional product video showcasing ${testProduct.name} with smooth transitions and modern aesthetics`,
          imageUrl: productForTest.imageUrl,
          productInfo: productForTest,
          templateConfig: selectedTemplate
        }
      });

      console.log('=== SUPABASE RESPONSE ===');
      console.log('Response data:', data);
      console.log('Response error:', error);

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setLastTestResult(data);
        
        console.log('=== SUCCESS - DATA SENT TO ZAPIER ===');
        console.log('Webhook data that was sent:', data.webhook_data);
        
        toast({
          title: "✅ Zapier Test Successful",
          description: `Real product data sent using "${selectedTemplate.name}" template. Check your Zap history for the webhook trigger.`,
        });

        // Additional success information
        toast({
          title: "🔍 Debug Info Available",
          description: "Check browser console for detailed payload information to help configure your Zap.",
        });

      } else {
        throw new Error(data.error || 'Failed to test Zapier webhook');
      }

    } catch (error) {
      console.error('=== ZAPIER TEST ERROR ===');
      console.error('Error details:', error);
      toast({
        title: "❌ Zapier Test Failed",
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
            Test your Zapier webhook with real product data from your inventory that matches Google Sheets column constraints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show which product will be used for testing */}
          {testProduct && (
            <div className="p-3 bg-white rounded-lg border">
              <h4 className="font-medium text-sm mb-2">Test Product from Inventory:</h4>
              <div className="flex items-center space-x-3">
                {testProduct.images?.[0] && (
                  <img 
                    src={testProduct.images[0]} 
                    alt={testProduct.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div>
                  <p className="font-medium text-sm">{testProduct.name}</p>
                  <p className="text-xs text-gray-600">{testProduct.category} • ${testProduct.price}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payload Preview and Copy Button */}
          {testProduct && selectedTemplate && (
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowPayloadPreview(!showPayloadPreview)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Eye className="h-4 w-4" />
                <span>{showPayloadPreview ? 'Hide' : 'Preview'} Payload</span>
              </Button>
              <Button
                onClick={copyPayloadToClipboard}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Copy className="h-4 w-4" />
                <span>Copy Payload</span>
              </Button>
            </div>
          )}

          <Button
            onClick={testZapierWebhook}
            disabled={isTestingZapier || !selectedTemplate || isLoadingProduct}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isTestingZapier && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isLoadingProduct 
              ? 'Loading Product...' 
              : selectedTemplate 
                ? `🚀 Send Real Data to Zapier (${selectedTemplate.name})` 
                : 'Select Template First'
            }
          </Button>

          {/* Payload Preview */}
          {showPayloadPreview && testProduct && selectedTemplate && (
            <div className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto">
              <h5 className="text-yellow-400 font-medium mb-2">Webhook Payload Preview:</h5>
              <pre className="whitespace-pre-wrap">
{JSON.stringify({
  timestamp: "2025-07-01T12:00:00.000Z",
  instruction: `Create a professional product video showcasing ${testProduct.name} with smooth transitions and modern aesthetics`,
  status: "pending",
  source: "feedgenerator_app",
  request_id: "example-uuid",
  template_id: selectedTemplate.id,
  template_name: selectedTemplate.name,
  product_name: testProduct.name.length > 81 ? testProduct.name.substring(0, 78) + '...' : testProduct.name,
  product_price: `$${testProduct.price}`,
  product_discount: "10%",
  category_name: testProduct.category || "General",
  feature_one: "AI-extracted feature from description...",
  feature_two: "AI-extracted feature from description...",
  feature_three: "AI-extracted feature from description...",
  website_description: testProduct.name.length > 22 ? testProduct.name.substring(0, 19) + '...' : testProduct.name,
  product_image: testProduct.images?.[0] || "default-image-url"
}, null, 2)}
              </pre>
            </div>
          )}
          
          {lastTestResult && (
            <div className="p-4 bg-white rounded-lg border space-y-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h4 className="font-medium">✅ Last Test Results - Data Sent Successfully</h4>
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
                  <h5 className="font-medium text-sm mb-2">Actual Data Sent:</h5>
                  {lastTestResult.processed_data && (
                    <div className="space-y-1 text-xs">
                      <div><strong>product_name:</strong> "{lastTestResult.processed_data.product_name}"</div>
                      <div><strong>product_price:</strong> "{lastTestResult.processed_data.product_price}"</div>
                      <div><strong>category_name:</strong> "{lastTestResult.processed_data.category_name}"</div>
                      <div><strong>product_discount:</strong> "{lastTestResult.processed_data.product_discount}"</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h5 className="font-medium text-sm mb-1 text-yellow-800">📋 Next Steps for Your Zap:</h5>
                <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                  <li>Check your Zap's history to confirm the webhook was received</li>
                  <li>Map the webhook fields to your Google Sheet columns</li>
                  <li>Use the field names shown above in your Zap configuration</li>
                  <li>Test your Zap to ensure data flows to the Google Sheet correctly</li>
                </ol>
              </div>
            </div>
          )}
          
          <div className="p-4 bg-white rounded-lg border">
            <h4 className="font-medium mb-2">🎯 Google Sheets Column Mapping:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <div><strong>product_name:</strong> Max 81 characters</div>
                <div><strong>category_name:</strong> Max 150 characters</div>
                <div><strong>website_description:</strong> Max 22 characters</div>
                <div><strong>product_price:</strong> Formatted as currency</div>
              </div>
              <div>
                <div><strong>feature_one:</strong> Max 80 characters (AI extracted)</div>
                <div><strong>feature_two:</strong> Max 80 characters (AI extracted)</div>
                <div><strong>feature_three:</strong> Max 80 characters (AI extracted)</div>
                <div><strong>product_discount:</strong> Percentage format</div>
                <div><strong>product_image:</strong> Image URL</div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              ✅ All fields are processed and validated before sending to match your Google Sheets columns exactly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
