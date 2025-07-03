import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Clapperboard } from "lucide-react";
import { TemplateSelector } from "./video-template/TemplateSelector";
import { ProductVariableTable } from "./video-template/ProductVariableTable";
import { VideoCreationControls } from "./video-template/VideoCreationControls";
import { ProductVideoLibrary } from "./ProductVideoLibrary";
import { templateManager, type TemplateDetail } from "@/api/template-manager";
import { supabase } from "@/integrations/supabase/client";
import { 
  InventoryItem, 
  ProductVariableState
} from "./video-template/types";
import { initializeProductVariables } from "./video-template/utils";

interface Template {
  id: string;
  name: string;
  variables: string[];
  thumbnail?: string;
}

interface VideoTemplateUtilityProps {
  selectedProduct: InventoryItem;
}

export function VideoTemplateUtility({ selectedProduct }: VideoTemplateUtilityProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [productVariables, setProductVariables] = useState<Record<string, ProductVariableState>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // Define template selection handler first
  const handleTemplateSelect = async (templateId: string) => {
    console.log('Template selected:', templateId);
    setSelectedTemplate(templateId);
    
    try {
      console.log('Fetching template detail with enhanced variable detection for:', templateId);
      
      // Get detailed template information with enhanced variable detection
      const templateDetail = await templateManager.getTemplateDetail(templateId, true);
      
      console.log('Template detail response:', templateDetail);
      console.log('Variables from template detail:', templateDetail?.variables);
      console.log('Variable count from template detail:', templateDetail?.variables?.length || 0);
      
      if (templateDetail && templateDetail.variables) {
        console.log('Setting template variables from API response:', templateDetail.variables);
        setTemplateVariables(templateDetail.variables);
        
        // Log each variable for debugging
        templateDetail.variables.forEach((variable, index) => {
          console.log(`Variable ${index + 1}: "${variable}"`);
        });
        
        // Generate AI suggestions for the variables
        await generateVariableSuggestions(templateDetail.variables);
        
        toast({
          title: "Template Selected",
          description: `${templateDetail.name} loaded with ${templateDetail.variables.length} variables for ${selectedProduct.name}`,
        });
      } else {
        console.error('Template detail is null or has no variables');
        
        // Try fallback approach
        const template = templates.find(t => t.id === templateId);
        if (template && template.variables.length > 0) {
          console.log('Using fallback template variables:', template.variables);
          setTemplateVariables(template.variables);
          await generateVariableSuggestions(template.variables);
          
          toast({
            title: "Template Selected",
            description: `${template.name} loaded with ${template.variables.length} variables (fallback)`,
            variant: "destructive"
          });
        } else {
          throw new Error('No variables found in template');
        }
      }
    } catch (error) {
      console.error('Error loading template detail:', error);
      
      // Final fallback
      const template = templates.find(t => t.id === templateId);
      if (template) {
        console.log('Using basic template fallback:', template);
        setTemplateVariables(template.variables || []);
        
        if (template.variables && template.variables.length > 0) {
          await generateVariableSuggestions(template.variables);
        }
        
        toast({
          title: "Template Selected",
          description: `${template.name} loaded (basic fallback) - ${template.variables?.length || 0} variables`,
          variant: "destructive"
        });
      } else {
        console.error('No template found for fallback');
        toast({
          title: "Error",
          description: "Could not load template variables. Please try another template.",
          variant: "destructive"
        });
      }
    }
  };

  // Fetch templates using the new template manager
  useEffect(() => {
    const fetchUserTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        console.log('Fetching templates using enhanced template manager');
        
        // Use database-first approach with enhanced variable detection
        const templateDetails = await templateManager.getClientTemplates('default');
        
        console.log('Raw template details from manager:', templateDetails);
        
        // Transform to the Template format expected by this component
        const transformedTemplates: Template[] = templateDetails.map(template => {
          console.log(`Processing template: ${template.name}`, {
            id: template.id,
            variables: template.variables,
            variableCount: template.variables.length
          });
          
          return {
            id: template.id,
            name: template.name,
            variables: template.variables,
            thumbnail: template.thumbnail
          };
        });

        setTemplates(transformedTemplates);
        console.log('Templates loaded with variable counts:', transformedTemplates.map(t => ({
          name: t.name,
          id: t.id,
          variableCount: t.variables.length,
          variables: t.variables
        })));
        
        if (transformedTemplates.length === 0) {
          toast({
            title: "No Templates Available",
            description: "No video templates are assigned to your account. Please contact your administrator.",
            variant: "destructive",
          });
        } else {
          console.log('Successfully loaded templates:', transformedTemplates);
          
          // Auto-select the first template with variables, or the mobile template if available
          const mobileTemplate = transformedTemplates.find(t => t.name.toLowerCase().includes('mobile'));
          const templateWithVariables = transformedTemplates.find(t => t.variables.length > 0);
          const templateToSelect = mobileTemplate || templateWithVariables;
          
          if (templateToSelect) {
            console.log('Auto-selecting template:', templateToSelect.name, 'with', templateToSelect.variables.length, 'variables');
            handleTemplateSelect(templateToSelect.id);
          }
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

  const generateVariableSuggestions = async (variables: string[]) => {
    try {
      console.log('Generating AI suggestions for variables:', variables);
      console.log('Variable count for AI suggestions:', variables.length);
      
      // If no variables, skip AI suggestions and initialize empty
      if (variables.length === 0) {
        console.log('No variables to generate suggestions for, initializing empty');
        setProductVariables({});
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('openai-variable-suggestions', {
        body: {
          product: selectedProduct,
          templateVariables: variables
        }
      });

      if (error) {
        throw new Error(`Function invocation failed: ${error.message}`);
      }

      
      if (data?.suggestions) {
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
    // If no variables, consider it as "all checked"
    if (templateVariables.length === 0) return true;
    return templateVariables.every(variable => 
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

    if (!areAllVariablesChecked() && templateVariables.length > 0) {
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
      title: "🎬 HeyGen Video Generation Started",
      description: "Your video is now being generated on HeyGen's servers. This typically takes 2-5 minutes. You can check progress in your HeyGen dashboard or wait for it to appear in the Asset Library.",
    });
    
    try {
      const finalData: Record<string, string> = {};
      templateVariables.forEach(variable => {
        const varData = productVariables[variable];
        // Use aiSuggested (which is now editable) as the final value
        finalData[variable] = varData.aiSuggested || varData.extracted || "";
      });

      console.log('Sending variables to video generation:', finalData);
      console.log('Variable count being sent:', Object.keys(finalData).length);

      let functionData: any = null;
      
      try {
        console.log('Testing basic function connectivity...');
        
        // First test basic connectivity
        const { data: testData, error: testError } = await supabase.functions.invoke('test-heygen');
        console.log('Test function response:', { testData, testError });
        
        if (testError) {
          throw new Error(`Function connectivity test failed: ${JSON.stringify(testError)}`);
        }
        
        if (!testData?.hasHeyGenKey) {
          throw new Error('HeyGen API key is not configured in Supabase secrets. Please add HEYGEN_API_KEY.');
        }
        
        console.log('Basic connectivity OK, now calling heygen-direct function...');
        
        const { data, error } = await supabase.functions.invoke('heygen-direct', {
          body: {
            templateId: selectedTemplate,
            productId: selectedProduct.id,
            templateData: {
              extracted: {},
              aiSuggested: {},
              userImproved: finalData
            },
            instruction: `Create video using template ${selectedTemplate} with product: ${selectedProduct.name}`
          }
        });

        console.log('Supabase function response:', { data, error });

        if (error) {
          console.error('Supabase function error details:', error);
          throw new Error(`Function invocation failed: ${JSON.stringify(error)}`);
        }

        if (!data) {
          throw new Error('No response data received from function');
        }
        
        functionData = data;
      } catch (networkError) {
        console.error('Network/Function error:', networkError);
        throw new Error(`Video generation service unavailable: ${networkError.message}`);
      }
      
      if (functionData?.success) {
        const templateName = templates.find(t => t.id === selectedTemplate)?.name || 'Selected Template';
        
        toast({
          title: "🎬 HeyGen Video Generation Started!",
          description: `Video for "${selectedProduct.name}" using "${templateName}" is now being processed on HeyGen. Check your HeyGen dashboard for progress or wait for it to appear in the Asset Library (2-5 minutes).`,
        });
        
        // Reset the form after successful submission
        setSelectedTemplate("");
        setTemplateVariables([]);
        setProductVariables({});
      } else {
        throw new Error(functionData?.error || 'Failed to create video');
      }
    } catch (error) {
      console.error('Error creating video:', error);
      
      let errorMessage = "Failed to send video creation request. Please check your settings and try again.";
      
      // Parse specific error details
      if (error instanceof Error) {
        if (error.message.includes('Missing required variables')) {
          errorMessage = `Video failed: ${error.message}`;
        } else if (error.message.includes('API key')) {
          errorMessage = "Video failed: Invalid API key or authentication issue";
        } else if (error.message.includes('template')) {
          errorMessage = "Video failed: Invalid template ID or template not found";
        } else {
          errorMessage = `Video failed: ${error.message}`;
        }
      }
      
      toast({
        title: "Video Generation Failed",
        description: errorMessage,
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
      {/* Generated Videos Library */}
      <ProductVideoLibrary 
        productId={selectedProduct.id} 
        productName={selectedProduct.name} 
      />
      
      {/* Template Utility */}
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
          {selectedTemplate && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center space-x-4">
                {templates.find(t => t.id === selectedTemplate)?.thumbnail && (
                  <img 
                    src={templates.find(t => t.id === selectedTemplate)?.thumbnail || `https://img.heygen.com/template/${selectedTemplate}/thumbnail.jpg`}
                    alt="Template thumbnail"
                    className="w-24 h-16 object-cover rounded border"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop';
                    }}
                  />
                )}
                <div>
                  <h3 className="font-semibold text-lg">
                    {templates.find(t => t.id === selectedTemplate)?.name || `Template ${selectedTemplate.slice(-8)}`}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {templateVariables.length} variables detected • Creating video for {selectedProduct.name}
                  </p>
                  {templateVariables.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      Variables: {templateVariables.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <TemplateSelector
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
          />

          {templateVariables.length === 0 && selectedTemplate ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                This template doesn't require any variables. You can proceed directly to create the video, or select a different template that allows customization.
              </p>
            </div>
          ) : (
            <ProductVariableTable
              selectedProduct={selectedProduct}
              templateVariables={templateVariables}
              productVariables={productVariables}
              onUpdateProductVariable={updateProductVariable}
            />
          )}

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
