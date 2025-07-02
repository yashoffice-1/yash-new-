
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const assignedTemplates: AssignedTemplate[] = [
    {
      id: "1",
      name: "Product Showcase",
      heygenId: "hg_template_001",
      variables: [
        { name: "product_name", type: "text", charLimit: 50 },
        { name: "product_price", type: "text", charLimit: 20 },
        { name: "product_discount", type: "text", charLimit: 15 },
        { name: "category_name", type: "text", charLimit: 30 },
        { name: "feature_one", type: "text", charLimit: 100 },
        { name: "feature_two", type: "text", charLimit: 100 },
        { name: "feature_three", type: "text", charLimit: 100 },
        { name: "website_description", type: "text", charLimit: 200 },
        { name: "product_image", type: "image_url", charLimit: 500 }
      ]
    },
    {
      id: "2",
      name: "Feature Highlight",
      heygenId: "hg_template_002",
      variables: [
        { name: "product_name", type: "text", charLimit: 50 },
        { name: "main_feature", type: "text", charLimit: 80 },
        { name: "benefit_one", type: "text", charLimit: 100 },
        { name: "benefit_two", type: "text", charLimit: 100 },
        { name: "call_to_action", type: "text", charLimit: 60 },
        { name: "brand_name", type: "text", charLimit: 40 },
        { name: "product_image", type: "image_url", charLimit: 500 }
      ]
    },
    {
      id: "3",
      name: "Brand Story",
      heygenId: "hg_template_003",
      variables: [
        { name: "brand_name", type: "text", charLimit: 40 },
        { name: "product_name", type: "text", charLimit: 50 },
        { name: "brand_story", type: "text", charLimit: 150 },
        { name: "unique_value", type: "text", charLimit: 100 },
        { name: "customer_testimonial", type: "text", charLimit: 120 },
        { name: "product_image", type: "image_url", charLimit: 500 },
        { name: "website_url", type: "url", charLimit: 200 }
      ]
    }
  ];

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
