import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Package, Sparkles, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { processProductForSpreadsheet } from "@/utils/productFieldProcessor";

interface ProductInfo {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  brand?: string | null;
  images?: string[];
}

interface TemplateConfig {
  id: string;
  name: string;
  webhookUrl: string;
  variables: string[];
  description?: string;
}

interface VideoTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductInfo;
}

const DEFAULT_TEMPLATES: TemplateConfig[] = [
  {
    id: 'heygen-product-showcase',
    name: 'HeyGen Product Showcase',
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/23139889/ube0vsx/',
    variables: [
      'product_name', 'product_price', 'product_discount', 
      'category_name', 'feature_one', 'feature_two', 
      'feature_three', 'website_description', 'product_image'
    ],
    description: 'Standard product showcase template with all fields'
  },
  {
    id: 'heygen-minimal',
    name: 'HeyGen Minimal',
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/23139889/minimal/',
    variables: ['product_name', 'product_price', 'product_image'],
    description: 'Minimal template with basic product info'
  }
];

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

export function VideoTemplateModal({ open, onOpenChange, product }: VideoTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const [isImproving, setIsImproving] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTemplateChange = (templateId: string) => {
    const template = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      
      // Pre-populate template variables with product data
      const processedData = processProductForSpreadsheet({
        name: product.name,
        description: product.description || undefined,
        category: product.category || undefined,
        price: product.price || undefined,
        imageUrl: product.images?.[0] || undefined,
      });
      
      const initialData: Record<string, string> = {};
      template.variables.forEach(variable => {
        if (variable in processedData) {
          initialData[variable] = processedData[variable as keyof typeof processedData] as string;
        } else {
          initialData[variable] = '';
        }
      });
      
      setTemplateData(initialData);
    }
  };

  const handleFieldChange = (variable: string, value: string) => {
    setTemplateData(prev => ({ ...prev, [variable]: value }));
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

  const handleSendToZapier = async () => {
    if (!selectedTemplate) {
      toast({
        title: "No Template Selected",
        description: "Please select a template first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Sending template data to Zapier:', {
        template: selectedTemplate.name,
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
          product_id: product.id,
          triggered_from: window.location.origin,
        }),
      });

      toast({
        title: "Template Sent Successfully!",
        description: `${selectedTemplate.name} template data has been sent to Zapier for HeyGen processing.`,
      });

      onOpenChange(false);

    } catch (error) {
      console.error("Error sending template:", error);
      toast({
        title: "Send Failed",
        description: "Failed to send template data. Please check the webhook URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Video className="h-5 w-5" />
            <span>Video Template Generator</span>
          </DialogTitle>
          <DialogDescription>
            Select a template and customize variables for {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Preview */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Package className="h-4 w-4" />
                <span>Selected Product</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                {product.images?.[0] && (
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <div className="flex space-x-2 mt-1">
                    {product.brand && (
                      <Badge variant="secondary" className="text-xs">{product.brand}</Badge>
                    )}
                    {product.category && (
                      <Badge variant="outline" className="text-xs">{product.category}</Badge>
                    )}
                    {product.price && (
                      <Badge variant="outline" className="text-xs text-green-600">${product.price}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <div className="space-y-4">
            <Label htmlFor="template-select">Select Template</Label>
            <Select onValueChange={handleTemplateChange} value={selectedTemplate?.id || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a video template..." />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_TEMPLATES.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{template.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {template.variables.length} vars
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedTemplate && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
              </div>
            )}
          </div>

          {/* Template Variables */}
          {selectedTemplate && (
            <div className="space-y-4">
              <h3 className="font-medium">Template Variables</h3>
              
              {selectedTemplate.variables.map(variable => {
                const constraint = VARIABLE_CONSTRAINTS[variable as keyof typeof VARIABLE_CONSTRAINTS];
                const currentValue = templateData[variable] || '';
                const charCount = currentValue.length;
                const maxLength = constraint?.maxLength || 0;
                const isOverLimit = charCount > maxLength;
                
                return (
                  <div key={variable} className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="font-medium">{variable}</Label>
                      <Badge variant={isOverLimit ? "destructive" : "secondary"} className="text-xs">
                        {charCount}/{maxLength}
                      </Badge>
                      {constraint && (
                        <p className="text-xs text-muted-foreground">
                          {constraint.description}
                        </p>
                      )}
                    </div>

                    <div className="lg:col-span-2">
                      {variable === 'website_description' || currentValue.length > 50 ? (
                        <Textarea
                          value={currentValue}
                          onChange={(e) => handleFieldChange(variable, e.target.value)}
                          className={`text-sm ${isOverLimit ? 'border-destructive' : ''}`}
                          rows={2}
                          placeholder={`Enter ${variable.replace('_', ' ')}...`}
                        />
                      ) : (
                        <Input
                          value={currentValue}
                          onChange={(e) => handleFieldChange(variable, e.target.value)}
                          className={`text-sm ${isOverLimit ? 'border-destructive' : ''}`}
                          placeholder={`Enter ${variable.replace('_', ' ')}...`}
                        />
                      )}
                    </div>

                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImproveField(variable)}
                        disabled={isImproving[variable] || !currentValue.trim()}
                        className="w-full"
                      >
                        {isImproving[variable] ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Improving...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-2" />
                            AI Improve
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Send Button */}
          {selectedTemplate && (
            <div className="flex justify-center pt-4 border-t">
              <Button
                onClick={handleSendToZapier}
                disabled={isLoading}
                size="lg"
                className="px-8 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending to HeyGen...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to Create Video
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
