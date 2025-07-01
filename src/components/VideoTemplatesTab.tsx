
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Plus, Settings, Calendar, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TemplateGrid } from "./templates/TemplateGrid";
import { TemplateRequestDialog } from "./templates/TemplateRequestDialog";
import { OnboardingDialog } from "./templates/OnboardingDialog";
import { TemplateSelector } from "./TemplateSelector";

interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  duration: string;
  status: 'active' | 'pending' | 'draft';
  heygenTemplateId?: string;
}

interface ProductInfo {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  discount?: string;
  brand?: string;
  imageUrl?: string;
  images?: string[];
}

interface VideoTemplatesTabProps {
  selectedProduct?: ProductInfo;
}

export function VideoTemplatesTab({ selectedProduct }: VideoTemplatesTabProps) {
  const { toast } = useToast();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock data for templates - in real implementation, this would fetch from HeyGen API
  const { data: templates, isLoading } = useQuery({
    queryKey: ['video-templates'],
    queryFn: async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock templates data
      const mockTemplates: VideoTemplate[] = [
        {
          id: '1',
          name: 'Product Showcase',
          description: 'Perfect for highlighting product features and benefits',
          thumbnail: '/placeholder.svg',
          category: 'Product',
          duration: '30s',
          status: 'active',
          heygenTemplateId: 'hg_template_001'
        },
        {
          id: '2',
          name: 'Brand Story',
          description: 'Tell your brand story with engaging visuals',
          thumbnail: '/placeholder.svg',
          category: 'Brand',
          duration: '60s',
          status: 'active',
          heygenTemplateId: 'hg_template_002'
        }
      ];
      
      return mockTemplates;
    },
  });

  const handleRequestTemplate = () => {
    setShowRequestDialog(true);
  };

  const handleScheduleMeeting = () => {
    // Open the Google Calendar in a new window
    window.open(
      'https://calendar.google.com/calendar/embed?src=c_b88aa561ec9cf8c4af90b9d75dbc8c7c747e52294707acfdf3ed7e0319558b4f%40group.calendar.google.com&ctz=America%2FNew_York',
      '_blank',
      'width=800,height=600,scrollbars=yes,resizable=yes'
    );
  };

  const handleOnboardingComplete = (data: any) => {
    console.log('Onboarding data:', data);
    setShowOnboardingDialog(false);
    toast({
      title: "Onboarding Complete",
      description: "Your brand information has been saved. Our team will create custom templates for you.",
    });
  };

  const handleSendTemplate = async (templateData: Record<string, string>) => {
    if (!selectedTemplate) {
      toast({
        title: "Error",
        description: "No template selected",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('Sending template data to webhook:', {
        template: selectedTemplate,
        data: templateData,
        webhookUrl: selectedTemplate.webhookUrl
      });

      const response = await fetch(selectedTemplate.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          ...templateData,
          timestamp: new Date().toISOString(),
          template_name: selectedTemplate.name,
          triggered_from: window.location.origin,
        }),
      });

      toast({
        title: "Template Sent Successfully!",
        description: `${selectedTemplate.name} template data has been sent to Zapier. Check your Zap history to confirm processing.`,
      });

      console.log('Template sent successfully');

    } catch (error) {
      console.error("Error sending template:", error);
      toast({
        title: "Send Failed",
        description: "Failed to send template data. Please check the webhook URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert selected product to the format expected by TemplateSelector
  const currentProduct = selectedProduct ? {
    name: selectedProduct.name,
    description: selectedProduct.description || undefined,
    category: selectedProduct.category || undefined,
    price: selectedProduct.price || undefined,
    brand: selectedProduct.brand || undefined,
    imageUrl: selectedProduct.images?.[0] || selectedProduct.imageUrl || undefined,
  } : undefined;

  return (
    <div className="space-y-6">
      {/* Selected Product Display */}
      {selectedProduct && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <Package className="h-5 w-5" />
              <span>Selected Product</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              {selectedProduct.images?.[0] && (
                <img 
                  src={selectedProduct.images[0]} 
                  alt={selectedProduct.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div>
                <h3 className="font-medium text-lg">{selectedProduct.name}</h3>
                <div className="flex space-x-2 mt-1">
                  {selectedProduct.brand && (
                    <Badge variant="secondary">{selectedProduct.brand}</Badge>
                  )}
                  {selectedProduct.category && (
                    <Badge variant="outline">{selectedProduct.category}</Badge>
                  )}
                  {selectedProduct.price && (
                    <Badge variant="outline" className="text-green-600">${selectedProduct.price}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Selector - Show when product is selected */}
      {selectedProduct && (
        <TemplateSelector
          onTemplateSelect={setSelectedTemplate}
          selectedTemplate={selectedTemplate}
          currentProduct={currentProduct}
          onSendTemplate={handleSendTemplate}
          isGenerating={isGenerating}
        />
      )}

      {/* Main Templates Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5" />
              <span>Video Templates</span>
              <Badge variant="outline">HeyGen Integration</Badge>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowOnboardingDialog(true)}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Brand Onboarding</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleScheduleMeeting}
                className="flex items-center space-x-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Schedule Meeting</span>
              </Button>
              <Button onClick={handleRequestTemplate} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Request Template</span>
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            {selectedProduct 
              ? `Configure video templates for ${selectedProduct.name}. Select a template above to customize variables and send to HeyGen.`
              : "Select a product from your inventory first to configure video templates. Templates will be customized with your product data."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedProduct ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Product Selected</h3>
              <p className="text-gray-500 mb-6">
                Please select a product from your inventory to configure video templates. 
                The templates will be populated with your product information.
              </p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <TemplateGrid templates={templates} />
          ) : (
            <div className="text-center py-12">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Available</h3>
              <p className="text-gray-500 mb-6">
                You don't have any video templates assigned yet. Get started by completing your brand onboarding or requesting a custom template.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setShowOnboardingDialog(true)}
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Complete Brand Onboarding</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRequestTemplate}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Request Custom Template</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TemplateRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
      />

      <OnboardingDialog
        open={showOnboardingDialog}
        onOpenChange={setShowOnboardingDialog}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
