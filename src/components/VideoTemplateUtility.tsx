
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Clapperboard, Send, Zap, Bot, CheckCircle } from "lucide-react";

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

interface VideoTemplateUtilityProps {
  selectedProduct: InventoryItem;
}

interface Template {
  id: string;
  name: string;
  variables: string[];
}

interface ProductVariableState {
  extracted: string;
  aiSuggested: string;
  userImproved: string;
  checked: boolean;
}

export function VideoTemplateUtility({ selectedProduct }: VideoTemplateUtilityProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [integrationMethod, setIntegrationMethod] = useState<'direct' | 'zapier'>('direct');
  
  // Per-product variable states
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

  const extractProductData = (variable: string): string => {
    switch (variable) {
      case "product_name":
        return selectedProduct.name || "";
      case "product_price":
        return selectedProduct.price ? `$${selectedProduct.price}` : "";
      case "category_name":
        return selectedProduct.category || "";
      case "brand_name":
        return selectedProduct.brand || "";
      case "website_description":
        return selectedProduct.description || "";
      case "product_image":
        return selectedProduct.images?.[0] || "";
      default:
        return "";
    }
  };

  const generateAISuggestion = (variable: string, extractedValue: string): string => {
    switch (variable) {
      case "product_name":
        return extractedValue ? `Professional ${extractedValue}` : "";
      case "product_price":
        return extractedValue || "$1,155";
      case "product_discount":
        return "15% Off Limited Time";
      case "category_name":
        return extractedValue || "Premium Tools";
      case "brand_name":
        return extractedValue || "Premium Brand";
      case "feature_one":
        return "Universal Compatibility";
      case "feature_two":
        return "Advanced Security Features";
      case "feature_three":
        return "User-Friendly Interface";
      case "main_feature":
        return "Industry-Leading Performance";
      case "benefit_one":
        return "Saves Time and Money";
      case "benefit_two":
        return "Professional Results";
      case "call_to_action":
        return "Order Now - Limited Time Offer!";
      case "brand_story":
        return "Trusted by professionals worldwide for over a decade";
      case "unique_value":
        return "The only solution you'll ever need";
      case "customer_testimonial":
        return "This product transformed our business operations";
      case "website_description":
        return extractedValue ? 
          `Complete ${extractedValue || "professional"} solution combining advanced technologies.` : 
          "Professional solution for your needs";
      case "product_image":
        return extractedValue || "https://example.com/product-image.jpg";
      case "website_url":
        return "https://yourwebsite.com";
      default:
        return "";
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      setTemplateVariables(template.variables);
      
      // Initialize product variables state
      const newProductVariables: Record<string, ProductVariableState> = {};
      template.variables.forEach(variable => {
        const extractedValue = extractProductData(variable);
        newProductVariables[variable] = {
          extracted: extractedValue,
          aiSuggested: generateAISuggestion(variable, extractedValue),
          userImproved: "",
          checked: false
        };
      });
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
      // Prepare final data using user improved values with fallbacks
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

  const formatVariableName = (variable: string): string => {
    return variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
          {/* Integration Method Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Integration Method</Label>
            <RadioGroup value={integrationMethod} onValueChange={(value: 'direct' | 'zapiar') => setIntegrationMethod(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direct" id="direct" />
                <Label htmlFor="direct" className="flex items-center space-x-2 cursor-pointer">
                  <Bot className="h-4 w-4" />
                  <span>Direct HeyGen API (Recommended)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="zapier" id="zapier" />
                <Label htmlFor="zapier" className="flex items-center space-x-2 cursor-pointer">
                  <Zap className="h-4 w-4" />
                  <span>Google Sheets + Zapier</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Choose Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a video template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Per-Product Variable Block */}
          {selectedTemplate && templateVariables.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Product: {selectedProduct.name}</h3>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{getCheckedCount()} / {templateVariables.length} completed</span>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-700">
                      <TableHead className="text-white">✅</TableHead>
                      <TableHead className="text-white">Variable Name</TableHead>
                      <TableHead className="text-white">Feed Value</TableHead>
                      <TableHead className="text-white">AI Suggested</TableHead>
                      <TableHead className="text-white">Your Final Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templateVariables.map((variable) => {
                      const varData = productVariables[variable];
                      return (
                        <TableRow key={variable} className={varData?.checked ? "bg-green-50" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={varData?.checked || false}
                              onCheckedChange={(checked) => 
                                updateProductVariable(variable, 'checked', !!checked)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatVariableName(variable)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {varData?.extracted || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-blue-600">
                            {varData?.aiSuggested || "-"}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={varData?.userImproved || ""}
                              onChange={(e) => updateProductVariable(variable, 'userImproved', e.target.value)}
                              placeholder={varData?.aiSuggested || "Enter value..."}
                              className="min-w-[200px]"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Send to Create Video Button */}
          {selectedTemplate && (
            <div className="flex justify-center pt-6">
              <Button
                onClick={handleSendToCreateVideo}
                disabled={isGenerating || !areAllVariablesChecked()}
                className={`px-8 py-3 text-base ${areAllVariablesChecked() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'}`}
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {isGenerating ? "Creating Video..." : 
                 areAllVariablesChecked() ? "Send to Make Video" : 
                 `Complete All Variables (${getCheckedCount()}/${templateVariables.length})`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
