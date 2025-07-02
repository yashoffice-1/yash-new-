import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Clapperboard } from "lucide-react";
import { TemplateSelector } from "./video-template/TemplateSelector";
import { IntegrationMethodSelector } from "./video-template/IntegrationMethodSelector";
import { ProductVariableTable } from "./video-template/ProductVariableTable";
import { VideoCreationControls } from "./video-template/VideoCreationControls";
import { templateManager, type TemplateDetail } from "@/api/template-manager";
import { 
  InventoryItem, 
  ProductVariableState, 
  IntegrationMethod 
} from "./video-template/types";
import { initializeProductVariables } from "./video-template/utils";

interface Template {
  id: string;
  name: string;
  variables: string[];
}

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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // Fetch templates using the new template manager
  useEffect(() => {
    const fetchUserTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        console.log('Fetching templates for video utility using template manager');
        
        const templateDetails = await templateManager.getClientTemplates('default');
        
        // Transform to the Template format expected by this component
        const transformedTemplates: Template[] = templateDetails.map(template => ({
          id: template.id,
          name: template.name,
          variables: template.variables
        }));

        setTemplates(transformedTemplates);
        
        if (transformedTemplates.length === 0) {
          toast({
            title: "No Templates Available",
            description: "No video templates are assigned to your account. Please contact your administrator.",
            variant: "destructive",
          });
        } else {
          console.log('Successfully loaded templates:', transformedTemplates);
        }
      } catch (error) {
        console.error('Error fetching user templates:', error);
        
        toast({
          title: "Template Loading Error",
          description: "Unable to load templates. Using fallback configuration.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchUserTemplates();
  }, [toast]);

  const handleTemplateSelect = async (templateId: string) => {
    console.log('Template selected:', templateId);
    setSelectedTemplate(templateId);
    
    try {
      console.log('Fetching template detail for:', templateId);
      // Get detailed template information including variable types
      const templateDetail = await templateManager.getTemplateDetail(templateId);
      
      console.log('Template detail response:', templateDetail);
      
      if (templateDetail) {
        console.log('Setting template variables:', templateDetail.variables);
        setTemplateVariables(templateDetail.variables);
        
        // Generate AI suggestions for the variables
        await generateVariableSuggestions(templateDetail.variables);
        
        
        toast({
          title: "Template Selected",
          description: `${templateDetail.name} loaded for ${selectedProduct.name}`,
        });
      } else {
        console.error('Template detail is null');
        throw new Error('Template detail not found');
      }
    } catch (error) {
      console.error('Error loading template detail:', error);
      
      // Fallback to basic template info
      const template = templates.find(t => t.id === templateId);
      console.log('Using fallback template:', template);
      if (template) {
        console.log('Setting fallback template variables:', template.variables);
        setTemplateVariables(template.variables);
        
        // Generate AI suggestions for fallback variables too
        await generateVariableSuggestions(template.variables);
        
        
        toast({
          title: "Template Selected",
          description: `${template.name} loaded for ${selectedProduct.name} (using fallback configuration)`,
          variant: "destructive"
        });
      } else {
        console.error('No fallback template found');
        toast({
          title: "Error",
          description: "Could not load template variables. Please try another template.",
          variant: "destructive"
        });
      }
    }
  };

  const generateVariableSuggestions = async (variables: string[]) => {
    try {
      console.log('Generating AI suggestions for variables:', variables);
      
      // If no variables, skip AI suggestions and initialize empty
      if (variables.length === 0) {
        console.log('No variables to generate suggestions for, initializing empty');
        setProductVariables({});
        return;
      }
      
      const response = await fetch('/functions/v1/openai-variable-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product: selectedProduct,
          templateVariables: variables
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.suggestions) {
        console.log('AI suggestions received:', data.suggestions);
        
        // Initialize product variables with AI suggestions
        const newProductVariables = initializeProductVariables(variables, selectedProduct, data.suggestions);
        console.log('Initialized product variables with AI suggestions:', newProductVariables);
        setProductVariables(newProductVariables);
      } else {
        throw new Error('No suggestions returned from AI');
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      
      // Fallback to basic initialization
      const newProductVariables = initializeProductVariables(variables, selectedProduct);
      console.log('Using fallback initialization:', newProductVariables);
      setProductVariables(newProductVariables);
      
      if (variables.length > 0) {
        toast({
          title: "AI Suggestions Unavailable",
          description: "Using basic suggestions. You can edit them manually.",
          variant: "destructive"
        });
      }
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
    
    // Show initial "getting ready" message
    toast({
      title: "Video Processing Started",
      description: "Your video is being prepared. This may take a few minutes...",
    });
    
    try {
      const finalData: Record<string, string> = {};
      templateVariables.forEach(variable => {
        const varData = productVariables[variable];
        // Use aiSuggested (which is now editable) as the final value
        finalData[variable] = varData.aiSuggested || varData.extracted || "";
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
        const templateName = templates.find(t => t.id === selectedTemplate)?.name || 'Selected Template';
        
        toast({
          title: "Video Generation Successful! 🎉",
          description: `Your video for "${selectedProduct.name}" using "${templateName}" has been successfully submitted via ${method}. You'll receive your video shortly!`,
        });
        
        // Reset the form after successful submission
        setSelectedTemplate("");
        setTemplateVariables([]);
        setProductVariables({});
      } else {
        throw new Error(result.error || 'Failed to create video');
      }
    } catch (error) {
      console.error('Error creating video:', error);
      toast({
        title: "Video Generation Failed",
        description: "Failed to send video creation request. Please check your settings and try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoadingTemplates) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clapperboard className="h-5 w-5" />
              <span>Video Template Utility</span>
            </CardTitle>
            <CardDescription>Loading your assigned templates...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
