import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, FileText } from "lucide-react";

interface TemplateVariable {
  name: string;
  type: string;
  charLimit: number;
}

interface AssignedTemplate {
  id: string;
  name: string;
  heygenId: string;
  variables: TemplateVariable[];
}

export function TemplatesSettings() {
  const { toast } = useToast();
  const [assignedTemplates, setAssignedTemplates] = useState<AssignedTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedTemplates = async () => {
      setIsLoading(true);
      try {
        // Fetch from HeyGen API first
        const { data, error } = await supabase.functions.invoke('heygen-templates');
        
        if (data && data.success) {
          // Filter to assigned templates and transform
          const assignedTemplateIds = [
            "bccf8cfb2b1e422dbc425755f1b7dc67",
            "3bb2bf2276754c0ea6b235db9409f508", 
            "47a53273dcd0428bbe7bf960b8bf7f02",
            "aeec955f97a6476d88e4547adfeb3c97"
          ];

          const userTemplates = data.templates
            .filter((template: any) => assignedTemplateIds.includes(template.template_id || template.id))
            .map((template: any) => ({
              id: template.template_id || template.id,
              name: template.name || `Template ${template.template_id?.slice(-8) || 'Unknown'}`,
              heygenId: template.template_id || template.id,
              variables: template.variables || getDefaultVariables(template.template_id || template.id)
            }));

          setAssignedTemplates(userTemplates);
        } else {
          throw new Error('Failed to fetch from HeyGen API');
        }
      } catch (error) {
        console.error('Error fetching assigned templates:', error);
        
        // Fallback to hardcoded templates
        const assignedTemplateIds = [
          "bccf8cfb2b1e422dbc425755f1b7dc67",
          "3bb2bf2276754c0ea6b235db9409f508", 
          "47a53273dcd0428bbe7bf960b8bf7f02",
          "aeec955f97a6476d88e4547adfeb3c97"
        ];

        const fallbackTemplates = assignedTemplateIds.map(templateId => ({
          id: templateId,
          name: `Template ${templateId.slice(-8)}`,
          heygenId: templateId,
          variables: getDefaultVariables(templateId)
        }));

        setAssignedTemplates(fallbackTemplates);
        
        toast({
          title: "Using Fallback Templates",
          description: "Unable to load templates from HeyGen. Using default configuration.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignedTemplates();
  }, [toast]);

  const getDefaultVariables = (templateId: string): TemplateVariable[] => {
    const defaultVariableMap: Record<string, TemplateVariable[]> = {
      "bccf8cfb2b1e422dbc425755f1b7dc67": [
        { name: "product_name", type: "text", charLimit: 50 },
        { name: "product_price", type: "text", charLimit: 20 },
        { name: "product_discount", type: "text", charLimit: 15 },
        { name: "category_name", type: "text", charLimit: 30 },
        { name: "feature_one", type: "text", charLimit: 100 },
        { name: "feature_two", type: "text", charLimit: 100 },
        { name: "feature_three", type: "text", charLimit: 100 },
        { name: "website_description", type: "text", charLimit: 200 },
        { name: "product_image", type: "image_url", charLimit: 500 }
      ],
      "3bb2bf2276754c0ea6b235db9409f508": [
        { name: "product_name", type: "text", charLimit: 50 },
        { name: "main_feature", type: "text", charLimit: 80 },
        { name: "benefit_one", type: "text", charLimit: 100 },
        { name: "benefit_two", type: "text", charLimit: 100 },
        { name: "call_to_action", type: "text", charLimit: 60 },
        { name: "brand_name", type: "text", charLimit: 40 },
        { name: "product_image", type: "image_url", charLimit: 500 }
      ],
      "47a53273dcd0428bbe7bf960b8bf7f02": [
        { name: "brand_name", type: "text", charLimit: 40 },
        { name: "product_name", type: "text", charLimit: 50 },
        { name: "brand_story", type: "text", charLimit: 150 },
        { name: "unique_value", type: "text", charLimit: 100 },
        { name: "customer_testimonial", type: "text", charLimit: 120 },
        { name: "product_image", type: "image_url", charLimit: 500 },
        { name: "website_url", type: "url", charLimit: 200 }
      ],
      "aeec955f97a6476d88e4547adfeb3c97": [
        { name: "product_name", type: "text", charLimit: 50 },
        { name: "product_price", type: "text", charLimit: 20 },
        { name: "discount_percent", type: "text", charLimit: 10 },
        { name: "brand_name", type: "text", charLimit: 40 },
        { name: "urgency_text", type: "text", charLimit: 80 },
        { name: "product_image", type: "image_url", charLimit: 500 },
        { name: "cta_text", type: "text", charLimit: 40 }
      ]
    };
    
    return defaultVariableMap[templateId] || [
      { name: "product_name", type: "text", charLimit: 50 },
      { name: "product_image", type: "image_url", charLimit: 500 }
    ];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Assigned Templates</span>
            </CardTitle>
            <CardDescription>Loading your assigned templates...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
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
            <FileText className="h-5 w-5" />
            <span>Assigned Templates</span>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Lock className="h-3 w-3" />
              <span>Assigned by Superadmin</span>
            </Badge>
          </CardTitle>
          <CardDescription>
            Video templates assigned to your account with their variable configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {assignedTemplates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{template.name}</h3>
                    <p className="text-sm text-gray-600">HeyGen ID: {template.heygenId}</p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variable Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Character Limit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {template.variables.map((variable, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {variable.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{variable.type}</Badge>
                          </TableCell>
                          <TableCell>{variable.charLimit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Templates are assigned by the system administrator based on your account plan and requirements. 
              These templates will automatically appear in your Video Template Utility.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
