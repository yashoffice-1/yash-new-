
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Clapperboard, Send } from "lucide-react";

interface TemplateData {
  productName: string;
  productPrice: string;
  productDiscount: string;
  categoryName: string;
  featureOne: string;
  featureTwo: string;
  featureThree: string;
  websiteDescription: string;
  productImage: string;
}

export function VideoTemplateUtility() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Mock data - would be populated from selected product
  const [templateData, setTemplateData] = useState<TemplateData>({
    productName: "XTOOL AutoProPAD Core Key Programmer with MaxiIM KM100 Universal Key Generator Kit",
    productPrice: "$1155",
    productDiscount: "",
    categoryName: "Programming Devices",
    featureOne: "",
    featureTwo: "",
    featureThree: "",
    websiteDescription: "XTOOL AutoProPAD Core Key Programmer Autel MaxiIM KM100 Key Generator Kit XTOOL - AutoProPAD Core Key Programmer AutoProPAD Core: Streamlined, Efficient, and Built for Speed For automotive security...",
    productImage: ""
  });

  const [aiSuggestions, setAiSuggestions] = useState<TemplateData>({
    productName: "Professional Automotive Key Programming Solution",
    productPrice: "$1,155",
    productDiscount: "15% Off",
    categoryName: "Automotive Tools",
    featureOne: "Universal Compatibility",
    featureTwo: "Advanced Security Features", 
    featureThree: "User-Friendly Interface",
    websiteDescription: "Complete automotive key programming solution combining XTOOL and Autel technologies for professional locksmiths and technicians.",
    productImage: "https://example.com/product-image.jpg"
  });

  const [userImproved, setUserImproved] = useState<TemplateData>({
    productName: "",
    productPrice: "",
    productDiscount: "",
    categoryName: "",
    featureOne: "",
    featureTwo: "",
    featureThree: "",
    websiteDescription: "",
    productImage: ""
  });

  const templates = [
    { id: "hg_template_001", name: "HeyGen Template 1 - Product Showcase" },
    { id: "hg_template_002", name: "HeyGen Template 2 - Feature Highlight" },
    { id: "hg_template_003", name: "HeyGen Template 3 - Brand Story" }
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      toast({
        title: "Template Selected",
        description: `${template.name} has been selected and data pre-filled.`,
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
          templateData: {
            extracted: templateData,
            aiSuggested: aiSuggestions,
            userImproved: userImproved
          },
          instruction: `Create video using template ${selectedTemplate} with product: ${userImproved.productName || aiSuggestions.productName || templateData.productName}`
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Video Creation Started",
          description: "Your video is being created via HeyGen. You'll be notified when it's ready.",
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

  const updateUserImproved = (field: keyof TemplateData, value: string) => {
    setUserImproved(prev => ({
      ...prev,
      [field]: value
    }));
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
            Select a template and customize the content for your video generation
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

          {/* Template Data Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-700 text-white">
                  <TableHead className="text-white">product name</TableHead>
                  <TableHead className="text-white">product price</TableHead>
                  <TableHead className="text-white">product discount</TableHead>
                  <TableHead className="text-white">category name</TableHead>
                  <TableHead className="text-white">feature one</TableHead>
                  <TableHead className="text-white">feature two</TableHead>
                  <TableHead className="text-white">feature three</TableHead>
                  <TableHead className="text-white">website description</TableHead>
                  <TableHead className="text-white">product image</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Raw Extracted Data */}
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium text-xs">{templateData.productName}</TableCell>
                  <TableCell className="text-xs">{templateData.productPrice}</TableCell>
                  <TableCell className="text-xs">{templateData.productDiscount}</TableCell>
                  <TableCell className="text-xs">{templateData.categoryName}</TableCell>
                  <TableCell className="text-xs">{templateData.featureOne}</TableCell>
                  <TableCell className="text-xs">{templateData.featureTwo}</TableCell>
                  <TableCell className="text-xs">{templateData.featureThree}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{templateData.websiteDescription}</TableCell>
                  <TableCell className="text-xs">{templateData.productImage}</TableCell>
                </TableRow>

                {/* AI Suggestions */}
                <TableRow className="bg-blue-50">
                  <TableCell className="font-medium text-xs">{aiSuggestions.productName}</TableCell>
                  <TableCell className="text-xs">{aiSuggestions.productPrice}</TableCell>
                  <TableCell className="text-xs">{aiSuggestions.productDiscount}</TableCell>
                  <TableCell className="text-xs">{aiSuggestions.categoryName}</TableCell>
                  <TableCell className="text-xs">{aiSuggestions.featureOne}</TableCell>
                  <TableCell className="text-xs">{aiSuggestions.featureTwo}</TableCell>
                  <TableCell className="text-xs">{aiSuggestions.featureThree}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{aiSuggestions.websiteDescription}</TableCell>
                  <TableCell className="text-xs">{aiSuggestions.productImage}</TableCell>
                </TableRow>

                {/* User Improved Final */}
                <TableRow>
                  <TableCell>
                    <Input 
                      value={userImproved.productName}
                      onChange={(e) => updateUserImproved('productName', e.target.value)}
                      placeholder="Enter final product name..."
                      className="text-xs h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={userImproved.productPrice}
                      onChange={(e) => updateUserImproved('productPrice', e.target.value)}
                      placeholder="Enter final price..."
                      className="text-xs h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={userImproved.productDiscount}
                      onChange={(e) => updateUserImproved('productDiscount', e.target.value)}
                      placeholder="Enter discount..."
                      className="text-xs h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={userImproved.categoryName}
                      onChange={(e) => updateUserImproved('categoryName', e.target.value)}
                      placeholder="Enter category..."
                      className="text-xs h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={userImproved.featureOne}
                      onChange={(e) => updateUserImproved('featureOne', e.target.value)}
                      placeholder="Feature 1..."
                      className="text-xs h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={userImproved.featureTwo}
                      onChange={(e) => updateUserImproved('featureTwo', e.target.value)}
                      placeholder="Feature 2..."
                      className="text-xs h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={userImproved.featureThree}
                      onChange={(e) => updateUserImproved('featureThree', e.target.value)}
                      placeholder="Feature 3..."
                      className="text-xs h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={userImproved.websiteDescription}
                      onChange={(e) => updateUserImproved('websiteDescription', e.target.value)}
                      placeholder="Enter description..."
                      className="text-xs h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={userImproved.productImage}
                      onChange={(e) => updateUserImproved('productImage', e.target.value)}
                      placeholder="Image URL..."
                      className="text-xs h-8"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Row Labels */}
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-50 border rounded"></div>
              <span>Raw Extracted Data</span>
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
