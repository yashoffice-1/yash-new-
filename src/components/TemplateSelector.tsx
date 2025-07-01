
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Video } from "lucide-react";

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
  imageUrl?: string;
}

interface TemplateSelectorProps {
  onTemplateSelect: (template: TemplateConfig) => void;
  selectedTemplate?: TemplateConfig;
  currentProduct?: ProductInfo;
  onSendTemplate?: (templateData: Record<string, string>) => Promise<void>;
  isGenerating?: boolean;
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

export function TemplateSelector({ 
  onTemplateSelect, 
  selectedTemplate, 
  currentProduct,
  onSendTemplate,
  isGenerating = false
}: TemplateSelectorProps) {
  const handleTemplateChange = (templateId: string) => {
    const template = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      onTemplateSelect(template);
    }
  };

  const handleSend = async () => {
    if (selectedTemplate && onSendTemplate && currentProduct) {
      const templateData: Record<string, string> = {};
      selectedTemplate.variables.forEach(variable => {
        switch (variable) {
          case 'product_name':
            templateData[variable] = currentProduct.name;
            break;
          case 'product_price':
            templateData[variable] = currentProduct.price ? `$${currentProduct.price}` : '';
            break;
          case 'product_discount':
            templateData[variable] = currentProduct.discount || '10%';
            break;
          case 'category_name':
            templateData[variable] = currentProduct.category || '';
            break;
          case 'website_description':
            templateData[variable] = currentProduct.description || currentProduct.name;
            break;
          case 'product_image':
            templateData[variable] = currentProduct.imageUrl || '';
            break;
          default:
            templateData[variable] = '';
        }
      });
      
      await onSendTemplate(templateData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Video className="h-5 w-5" />
          <span>Template Configuration</span>
        </CardTitle>
        <CardDescription>
          Select and configure a video template for your product
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Template</label>
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

        {selectedTemplate && onSendTemplate && (
          <Button
            onClick={handleSend}
            disabled={isGenerating || !currentProduct}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Template
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
