
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Lock, FileText } from "lucide-react";
import { templateManager, type TemplateDetail, type TemplateVariable } from "@/api/template-manager";

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
        console.log('Fetching assigned templates using template manager');
        
        const templateDetails = await templateManager.getClientTemplates('default');
        
        // Transform to AssignedTemplate format
        const assignedTemplates: AssignedTemplate[] = templateDetails.map(template => {
          // Convert variableTypes to TemplateVariable array
          const variables: TemplateVariable[] = Object.entries(template.variableTypes).map(([name, config]) => ({
            name: name,
            type: config.type,
            charLimit: config.charLimit,
            required: config.required,
            description: config.description
          }));

          return {
            id: template.id,
            name: template.name,
            heygenId: template.id,
            variables: variables
          };
        });

        setAssignedTemplates(assignedTemplates);
        console.log('Successfully loaded assigned templates:', assignedTemplates);
        
      } catch (error) {
        console.error('Error fetching assigned templates:', error);
        
        toast({
          title: "Template Loading Error",
          description: "Unable to load templates from HeyGen. Please try refreshing the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignedTemplates();
  }, [toast]);

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
                        <TableHead>Required</TableHead>
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
                          <TableCell>
                            <Badge variant={variable.required ? "destructive" : "outline"}>
                              {variable.required ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
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
              <strong>Note:</strong> Templates are dynamically loaded from HeyGen API with intelligent caching. 
              Template configurations will automatically update when changes are made in HeyGen.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
