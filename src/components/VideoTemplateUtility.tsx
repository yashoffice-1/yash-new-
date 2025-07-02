
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Clapperboard } from "lucide-react";
import { TemplateSelector } from "./video-template/TemplateSelector";
import { IntegrationMethodSelector } from "./video-template/IntegrationMethodSelector";
import { ProductVariableTable } from "./video-template/ProductVariableTable";
import { VideoCreationControls } from "./video-template/VideoCreationControls";
import { 
  InventoryItem, 
  Template, 
  ProductVariableState, 
  IntegrationMethod 
} from "./video-template/types";
import { initializeProductVariables } from "./video-template/utils";

interface VideoTemplateUtilityProps {
  selectedProduct: InventoryItem;
}

export function VideoTemplateUtility({ selectedProduct }: VideoTemplateUtilityProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [integrationMethod, setIntegrationMethod] = useState<IntegrationMethod>('direct');
  const [productVariables, setProductVariables] = useState<Record<string, ProductVariableState>>({});

  const templates: Template[] = [
    { 
      id: "hg_template_001", 
      name: "Product Showcase",
      variables: ["product_name", "product_price", "product_discount", "category_name", "feature_one", "feature_two", "feature_three", "website_description", "product_image"]
    },
    { 
      id: "hg_template_002", 
      name: "Feature Highlight",
      variables: ["product_name", "main_feature", "benefit_one", "benefit_two", "call_to_action", "brand_name", "product_image"]
    },
    { 
      id: "hg_template_003", 
      name: "Brand Story",
      variables: ["brand_name", "product_name", "brand_story", "unique_value", "customer_testimonial", "product_image", "website_url"]
    }
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      setTemplateVariables(template.variables);
      const newProductVariables = initializeProductVariables(template.variables, selectedProduct);
      setProductVariables(newProductVariables);
      
      toast({
        title: "Template Selected",
        description: `${template.name} loaded for ${selectedProduct.name}`,
      });
    }
  };

  const updateProductVariable = (variable: string, field: keyof ProductVariableState, value: string | boolean) => {
    setProductVariables(prev => ({
      ...prev,
      [variable]: {
        ...prev[variable],
        [field]: value
      }
    }));
  };

  const areAllVariablesChecked = () => {
    return templateVariables.length > 0 && templateVariables.every(variable => 
      productVariables[variable]?.checked === true
    );
  };

  const getCheckedCount = () => {
    return templateVariables.filter(variable => productVariables[variable]?.checked === true).length;
  };

  const handleSendToCreateVideo = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Select Template",
        description: "Please choose a template before creating the video.",
        variant: "destructive",
      });
      return;
    }

    if (!areAllVariablesChecked()) {
      toast({
        title: "Complete All Variables",
        description: "Please check all variables before creating the video.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const finalData: Record<string, string> = {};
      templateVariables.forEach(variable => {
        const varData = productVariables[variable];
        finalData[variable] = varData.userImproved || varData.aiSuggested || varData.extracted || "";
      });

      const endpoint = integrationMethod === 'direct' ? '/api/heygen-direct' : '/api/heygen-generate';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          productId: selectedProduct.id,
          templateData: {
            extracted: {},
            aiSuggested: {},
            userImproved: finalData
          },
          instruction: `Create video using template ${selectedTemplate} with product: ${selectedProduct.name}`
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const method = integrationMethod === 'direct' ? 'HeyGen Direct API' : 'Google Sheets + Zapier';
        toast({
          title: "Video Creation Started",
          description: `Video creation started for ${selectedProduct.name} using ${templates.find(t => t.id === selectedTemplate)?.name} via ${method}.`,
        });
      } else {
        throw new Error(result.error || 'Failed to create video');
      }
    } catch (error) {
      console.error('Error creating video:', error);
      toast({
        title: "Error",
        description: "Failed to send video creation request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clapperboard className="h-5 w-5" />
            <span>Video Template Utility</span>
          </CardTitle>
          <CardDescription>
            Create video for: <strong>{selectedProduct.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <IntegrationMethodSelector
            integrationMethod={integrationMethod}
            onIntegrationMethodChange={setIntegrationMethod}
          />

          <TemplateSelector
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
          />

          <ProductVariableTable
            selectedProduct={selectedProduct}
            templateVariables={templateVariables}
            productVariables={productVariables}
            onUpdateProductVariable={updateProductVariable}
          />

          <VideoCreationControls
            selectedTemplate={selectedTemplate}
            isGenerating={isGenerating}
            areAllVariablesChecked={areAllVariablesChecked()}
            checkedCount={getCheckedCount()}
            totalVariables={templateVariables.length}
            onSendToCreateVideo={handleSendToCreateVideo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
