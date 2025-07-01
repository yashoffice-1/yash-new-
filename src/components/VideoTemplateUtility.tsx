
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Clapperboard, Send } from "lucide-react";

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

export function VideoTemplateUtility({ selectedProduct }: VideoTemplateUtilityProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  
  // Dynamic template data based on current template variables
  const [extractedData, setExtractedData] = useState<Record<string, string>>({});
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});
  const [userImproved, setUserImproved] = useState<Record<string, string>>({});

  const templates: Template[] = [
    { 
      id: "hg_template_001", 
      name: "HeyGen Template 1 - Product Showcase",
      variables: ["product_name", "product_price", "product_discount", "category_name", "feature_one", "feature_two", "feature_three", "website_description", "product_image"]
    },
    { 
      id: "hg_template_002", 
      name: "HeyGen Template 2 - Feature Highlight",
      variables: ["product_name", "main_feature", "benefit_one", "benefit_two", "call_to_action", "brand_name", "product_image"]
    },
    { 
      id: "hg_template_003", 
      name: "HeyGen Template 3 - Brand Story",
      variables: ["brand_name", "product_name", "brand_story", "unique_value", "customer_testimonial", "product_image", "website_url"]
    }
  ];

  // Extract data from selected product
  const extractProductData = (variables: string[]): Record<string, string> => {
    const data: Record<string, string> = {};
    
    variables.forEach(variable => {
      switch (variable) {
        case "product_name":
          data[variable] = selectedProduct.name || "";
          break;
        case "product_price":
          data[variable] = selectedProduct.price ? `$${selectedProduct.price}` : "";
          break;
        case "product_discount":
          data[variable] = "";
          break;
        case "category_name":
          data[variable] = selectedProduct.category || "";
          break;
        case "brand_name":
          data[variable] = selectedProduct.brand || "";
          break;
        case "website_description":
          data[variable] = selectedProduct.description || "";
          break;
        case "product_image":
          data[variable] = selectedProduct.images?.[0] || "";
          break;
        case "feature_one":
        case "feature_two":
        case "feature_three":
        case "main_feature":
        case "benefit_one":
        case "benefit_two":
        case "call_to_action":
        case "brand_story":
        case "unique_value":
        case "customer_testimonial":
        case "website_url":
          data[variable] = "";
          break;
        default:
          data[variable] = "";
      }
    });
    
    return data;
  };

  // Generate AI suggestions based on extracted data
  const generateAISuggestions = (variables: string[], extracted: Record<string, string>): Record<string, string> => {
    const suggestions: Record<string, string> = {};
    
    variables.forEach(variable => {
      switch (variable) {
        case "product_name":
          suggestions[variable] = extracted[variable] ? `Professional ${extracted[variable]}` : "";
          break;
        case "product_price":
          suggestions[variable] = extracted[variable] || "$1,155";
          break;
        case "product_discount":
          suggestions[variable] = "15% Off";
          break;
        case "category_name":
          suggestions[variable] = extracted[variable] || "Premium Tools";
          break;
        case "brand_name":
          suggestions[variable] = extracted[variable] || "Premium Brand";
          break;
        case "feature_one":
          suggestions[variable] = "Universal Compatibility";
          break;
        case "feature_two":
          suggestions[variable] = "Advanced Security Features";
          break;
        case "feature_three":
          suggestions[variable] = "User-Friendly Interface";
          break;
        case "main_feature":
          suggestions[variable] = "Industry-Leading Performance";
          break;
        case "benefit_one":
          suggestions[variable] = "Saves Time and Money";
          break;
        case "benefit_two":
          suggestions[variable] = "Professional Results";
          break;
        case "call_to_action":
          suggestions[variable] = "Order Now - Limited Time Offer!";
          break;
        case "brand_story":
          suggestions[variable] = "Trusted by professionals worldwide for over a decade";
          break;
        case "unique_value":
          suggestions[variable] = "The only solution you'll ever need";
          break;
        case "customer_testimonial":
          suggestions[variable] = "This product transformed our business operations";
          break;
        case "website_description":
          suggestions[variable] = extracted[variable] ? 
            `Complete ${extracted["category_name"] || "professional"} solution combining advanced technologies for professionals.` : 
            "Professional solution for your needs";
          break;
        case "product_image":
          suggestions[variable] = extracted[variable] || "https://example.com/product-image.jpg";
          break;
        case "website_url":
          suggestions[variable] = "https://yourwebsite.com";
          break;
        default:
          suggestions[variable] = "";
      }
    });
    
    return suggestions;
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      setTemplateVariables(template.variables);
      
      // Extract data from product
      const extracted = extractProductData(template.variables);
      setExtractedData(extracted);
      
      // Generate AI suggestions
      const suggestions = generateAISuggestions(template.variables, extracted);
      setAiSuggestions(suggestions);
      
      // Reset user improvements
      const userReset: Record<string, string> = {};
      template.variables.forEach(variable => {
        userReset[variable] = "";
      });
      setUserImproved(userReset);
      
      toast({
        title: "Template Selected",
        description: `${template.name} has been selected and data pre-filled from ${selectedProduct.name}.`,
      });
    }
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

    setIsGenerating(true);
    
    try {
      // Send to HeyGen via existing edge function
      const response = await fetch('/api/heygen-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          productId: selectedProduct.id,
          templateData: {
            extracted: extractedData,
            aiSuggested: aiSuggestions,
            userImproved: userImproved
          },
          instruction: `Create video using template ${selectedTemplate} with product: ${selectedProduct.name}`
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Video Creation Started",
          description: `Video creation started for ${selectedProduct.name} using ${templates.find(t => t.id === selectedTemplate)?.name}. You'll be notified when it's ready.`,
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

  const updateUserImproved = (field: string, value: string) => {
    setUserImproved(prev => ({
      ...prev,
      [field]: value
    }));
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
            Select a template and customize the content for {selectedProduct.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Selection Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Choose Template</label>
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

          {/* Template Data Table - Only show if template is selected */}
          {selectedTemplate && templateVariables.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-700 text-white">
                    {templateVariables.map((variable) => (
                      <TableHead key={variable} className="text-white text-xs">
                        {formatVariableName(variable)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Raw Extracted Data */}
                  <TableRow className="bg-gray-50">
                    {templateVariables.map((variable) => (
                      <TableCell key={variable} className="font-medium text-xs max-w-xs truncate">
                        {extractedData[variable] || "-"}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* AI Suggestions */}
                  <TableRow className="bg-blue-50">
                    {templateVariables.map((variable) => (
                      <TableCell key={variable} className="text-xs max-w-xs truncate">
                        {aiSuggestions[variable] || "-"}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* User Improved Final */}
                  <TableRow>
                    {templateVariables.map((variable) => (
                      <TableCell key={variable}>
                        <Input 
                          value={userImproved[variable] || ""}
                          onChange={(e) => updateUserImproved(variable, e.target.value)}
                          placeholder={`Enter ${formatVariableName(variable).toLowerCase()}...`}
                          className="text-xs h-8"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {/* Row Labels - Only show if template is selected */}
          {selectedTemplate && (
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-50 border rounded"></div>
                <span>Raw Extracted Data from {selectedProduct.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-50 border rounded"></div>
                <span>AI Suggestions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-white border rounded"></div>
                <span>User Improved Final</span>
              </div>
            </div>
          )}

          {/* Send to Create Video Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleSendToCreateVideo}
              disabled={isGenerating || !selectedTemplate}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base"
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {isGenerating ? "Creating Video..." : "Send to Create Video"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
