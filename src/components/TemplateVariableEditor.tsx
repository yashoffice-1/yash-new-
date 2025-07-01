
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Edit3, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { processProductForSpreadsheet, validateProcessedData } from "@/utils/productFieldProcessor";

interface TemplateConfig {
  id: string;
  name: string;
  webhookUrl: string;
  variables: string[];
  description?: string;
}

interface ProductInfo {
  name: string;
  description?: string;
  category?: string;
  price?: number;
  discount?: string;
  brand?: string;
  imageUrl?: string;
}

interface TemplateVariableEditorProps {
  template: TemplateConfig;
  product: ProductInfo;
  onSendTemplate: (templateData: Record<string, string>) => void;
  isGenerating?: boolean;
}

const VARIABLE_CONSTRAINTS = {
  product_name: { maxLength: 81, description: "Product name with brand and key features" },
  product_price: { maxLength: 20, description: "Price in currency format (e.g., $99.99)" },
  product_discount: { maxLength: 10, description: "Discount percentage (e.g., 15%)" },
  category_name: { maxLength: 150, description: "Product category and subcategory" },
  feature_one: { maxLength: 80, description: "Primary product feature or benefit" },
  feature_two: { maxLength: 80, description: "Secondary product feature or benefit" },
  feature_three: { maxLength: 80, description: "Third product feature or benefit" },
  website_description: { maxLength: 22, description: "Brief tagline or description" },
  product_image: { maxLength: 500, description: "Product image URL" }
} as const;

export function TemplateVariableEditor({ 
  template, 
  product, 
  onSendTemplate,
  isGenerating = false 
}: TemplateVariableEditorProps) {
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [isImproving, setIsImproving] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize template data when template or product changes
  useEffect(() => {
    if (template && product) {
      const processedData = processProductForSpreadsheet(product);
      const initialData: Record<string, string> = {};
      
      template.variables.forEach(variable => {
        if (variable in processedData) {
          initialData[variable] = processedData[variable as keyof typeof processedData] as string;
        } else {
          initialData[variable] = '';
        }
      });
      
      setTemplateData(initialData);
      validateAllFields(initialData);
    }
  }, [template, product]);

  const validateAllFields = (data: Record<string, string>) => {
    const errors: Record<string, string> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      const constraint = VARIABLE_CONSTRAINTS[key as keyof typeof VARIABLE_CONSTRAINTS];
      if (constraint && value.length > constraint.maxLength) {
        errors[key] = `Exceeds ${constraint.maxLength} characters (${value.length})`;
      }
    });
    
    setValidationErrors(errors);
  };

  const handleFieldChange = (variable: string, value: string) => {
    const newData = { ...templateData, [variable]: value };
    setTemplateData(newData);
    validateAllFields(newData);
  };

  const handleImproveField = async (variable: string) => {
    const currentValue = templateData[variable];
    if (!currentValue?.trim()) {
      toast({
        title: "No Content",
        description: "Please enter some content first before improving.",
        variant: "destructive"
      });
      return;
    }

    setIsImproving(prev => ({ ...prev, [variable]: true }));

    try {
      const constraint = VARIABLE_CONSTRAINTS[variable as keyof typeof VARIABLE_CONSTRAINTS];
      const { data, error } = await supabase.functions.invoke('openai-generate', {
        body: {
          type: 'improve-template-field',
          fieldName: variable,
          currentValue: currentValue.trim(),
          constraint: constraint,
          productInfo: product,
          context: {
            maxLength: constraint?.maxLength,
            description: constraint?.description,
            purpose: 'Optimize this field for template variable while staying within character limits'
          }
        }
      });

      if (error || !data.success) {
        throw new Error(data?.error || 'Failed to improve field');
      }

      const improvedValue = data.result.trim();
      handleFieldChange(variable, improvedValue);
      
      toast({
        title: "Field Improved",
        description: `${variable} has been optimized with AI assistance.`
      });
    } catch (error) {
      console.error('Error improving field:', error);
      toast({
        title: "Improvement Failed",
        description: error.message || "Failed to improve field. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsImproving(prev => ({ ...prev, [variable]: false }));
    }
  };

  const handleSendTemplate = async () => {
    // Final validation
    const hasErrors = Object.keys(validationErrors).length > 0;
    if (hasErrors) {
      toast({
        title: "Validation Errors",
        description: "Please fix all validation errors before sending.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSendTemplate(templateData);
    } finally {
      setIsLoading(false);
    }
  };

  const getCharacterCount = (variable: string) => {
    const value = templateData[variable] || '';
    const constraint = VARIABLE_CONSTRAINTS[variable as keyof typeof VARIABLE_CONSTRAINTS];
    const maxLength = constraint?.maxLength || 0;
    const isOverLimit = value.length > maxLength;
    
    return {
      current: value.length,
      max: maxLength,
      isOverLimit,
      percentage: maxLength > 0 ? (value.length / maxLength) * 100 : 0
    };
  };

  if (!template) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Edit3 className="h-5 w-5" />
          <span>Template Variables Editor</span>
        </CardTitle>
        <CardDescription>
          Review and edit the template variables for "{template.name}" before sending. 
          All fields will be populated in your connected spreadsheet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Preview */}
        <div className="p-3 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Product: {product.name}</h4>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {product.brand && <Badge variant="outline">{product.brand}</Badge>}
            {product.category && <Badge variant="outline">{product.category}</Badge>}
            {product.price && <Badge variant="outline">${product.price}</Badge>}
          </div>
        </div>

        {/* Template Variables */}
        <div className="space-y-4">
          <h4 className="font-medium">Template Variables ({template.variables.length})</h4>
          
          {template.variables.map(variable => {
            const constraint = VARIABLE_CONSTRAINTS[variable as keyof typeof VARIABLE_CONSTRAINTS];
            const charCount = getCharacterCount(variable);
            const hasError = validationErrors[variable];
            const isCurrentlyEditing = isEditing[variable];
            const isCurrentlyImproving = isImproving[variable];
            
            return (
              <div key={variable} className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 border rounded-lg">
                {/* Variable Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">{variable}</Label>
                    <Badge variant={hasError ? "destructive" : "secondary"} className="text-xs">
                      {charCount.current}/{charCount.max}
                    </Badge>
                  </div>
                  {constraint && (
                    <p className="text-xs text-muted-foreground">
                      {constraint.description}
                    </p>
                  )}
                  {hasError && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ {hasError}
                    </p>
                  )}
                </div>

                {/* Current Value */}
                <div className="space-y-2">
                  <Label className="text-sm">Current Value</Label>
                  {variable === 'website_description' || templateData[variable]?.length > 50 ? (
                    <Textarea
                      value={templateData[variable] || ''}
                      onChange={(e) => handleFieldChange(variable, e.target.value)}
                      className={`text-sm ${hasError ? 'border-destructive' : ''}`}
                      rows={3}
                      placeholder={`Enter ${variable.replace('_', ' ')}...`}
                    />
                  ) : (
                    <Input
                      value={templateData[variable] || ''}
                      onChange={(e) => handleFieldChange(variable, e.target.value)}
                      className={`text-sm ${hasError ? 'border-destructive' : ''}`}
                      placeholder={`Enter ${variable.replace('_', ' ')}...`}
                    />
                  )}
                  
                  {/* Character count progress */}
                  {constraint && (
                    <div className="w-full bg-muted rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full transition-all ${
                          charCount.isOverLimit ? 'bg-destructive' : 
                          charCount.percentage > 80 ? 'bg-yellow-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(charCount.percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* AI Actions */}
                <div className="space-y-2">
                  <Label className="text-sm">AI Assistant</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleImproveField(variable)}
                    disabled={isCurrentlyImproving || !templateData[variable]?.trim()}
                    className="w-full"
                  >
                    {isCurrentlyImproving ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Improving...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-2" />
                        Improve with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Send Template Button */}
        <div className="flex justify-center pt-4 border-t">
          <Button
            onClick={handleSendTemplate}
            disabled={isLoading || isGenerating || Object.keys(validationErrors).length > 0}
            size="lg"
            className="px-8"
          >
            {isLoading || isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Template...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Template to {template.name}
              </>
            )}
          </Button>
        </div>

        {/* Summary */}
        <div className="text-center text-sm text-muted-foreground">
          Template will be sent to: <span className="font-mono text-xs">{template.webhookUrl}</span>
        </div>
      </CardContent>
    </Card>
  );
}
