import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Video } from "lucide-react";
import { templateManager } from "@/api/template-manager";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";

interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  duration: string;
  status: 'active' | 'pending' | 'draft';
  heygenTemplateId?: string;
  variables?: string[];
  aspectRatio?: 'landscape' | 'portrait';
  templateDetails?: any;
}

interface TemplateVideoCreatorProps {
  template: VideoTemplate;
}

export function TemplateVideoCreator({ template }: TemplateVideoCreatorProps) {
  const { toast } = useToast();
  const { generateVideo, isGenerating } = useVideoGeneration();
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);

  useEffect(() => {
    const fetchTemplateDetails = async () => {
      setIsLoadingTemplate(true);
      try {
        console.log('Fetching template details for template ID:', template.id);
        
        let templateDetail;
        
        // For HeyGen templates, always use pre-fetched details or HeyGen API
        if (template.heygenTemplateId) {
          if (template.templateDetails) {
            console.log('Using pre-fetched HeyGen template details');
            const variables = template.templateDetails.variables ? Object.keys(template.templateDetails.variables) : [];
            templateDetail = {
              id: template.id,
              name: template.name,
              description: template.description,
              thumbnail: template.thumbnail,
              category: template.category,
              duration: template.duration,
              variables: variables,
              variableTypes: variables.reduce((acc, varName) => {
                acc[varName] = {
                  name: varName,
                  type: 'text',
                  charLimit: 100,
                  required: true
                };
                return acc;
              }, {} as Record<string, any>)
            };
          } else {
            console.log('HeyGen template detected, using HeyGen API endpoint');
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/templates/heygen/detail/${template.heygenTemplateId}`);
            
            if (!response.ok) {
              throw new Error(`HeyGen API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data) {
              // Convert HeyGen template data to our format
              const variables = data.data.variables ? Object.keys(data.data.variables) : [];
              templateDetail = {
                id: template.id,
                name: template.name,
                description: template.description,
                thumbnail: template.thumbnail,
                category: template.category,
                duration: template.duration,
                variables: variables,
                variableTypes: variables.reduce((acc, varName) => {
                  acc[varName] = {
                    name: varName,
                    type: 'text',
                    charLimit: 100,
                    required: true
                  };
                  return acc;
                }, {} as Record<string, any>)
              };
            } else {
              throw new Error('Failed to fetch HeyGen template details');
            }
          }
        } else {
          // Use the regular template manager for non-HeyGen templates
          templateDetail = await templateManager.getTemplateDetail(template.id);
        }
        
        console.log('Raw template detail response:', templateDetail);
        
        if (templateDetail) {
          console.log('Template variables found:', templateDetail.variables);
          console.log('Template variables length:', templateDetail.variables.length);
          setTemplateVariables(templateDetail.variables);
          
          // Initialize variable values with empty strings (no predefined values)
          const initialValues: Record<string, string> = {};
          templateDetail.variables.forEach(variable => {
            initialValues[variable] = '';
          });
          console.log('Initial variable values (empty):', initialValues);
          setVariableValues(initialValues);
        } else {
          console.error('Template detail is null - no template found');
        }
      } catch (error) {
        console.error('Error loading template details:', error);
        toast({
          title: "Template Loading Error",
          description: "Could not load template details. Using basic template.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    fetchTemplateDetails();
  }, [template.id, template.heygenTemplateId, template.templateDetails, toast]);

  const handleVariableChange = (variable: string, value: string) => {
    setVariableValues(prev => ({
      ...prev,
      [variable]: value
    }));
  };

  const handleCreateVideo = async () => {
    try {
      // Show immediate feedback that request is being sent
      toast({
        title: "🚀 Sending Video Request",
        description: "Sending your video generation request to HeyGen...",
      });

      // Create an instruction based on the template and variables
      const instruction = `Create video using template ${template.id} with product: ${Object.entries(variableValues).map(([key, value]) => `${key}: ${value}`).join(', ')}`;
      
      // Use HeyGen for video generation with template
      await generateVideo(instruction, undefined, 'heygen');
      
             toast({
         title: "✅ Request Sent Successfully",
         description: `Video generation request sent to HeyGen using template "${template.name}". Check the Asset Library to monitor progress!`,
       });
    } catch (error) {
      console.error('Error creating video:', error);
      toast({
        title: "❌ Request Failed",
        description: "Failed to send video generation request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const canCreateVideo = templateVariables.length === 0 || templateVariables.every(variable => 
    variableValues[variable] && variableValues[variable].trim() !== ''
  );

  if (isLoadingTemplate) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Loading Template...</CardTitle>
            <CardDescription>Fetching template details</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center space-x-2">
            <Video className="h-5 w-5" />
            <span>Create Video: {template.name}</span>
          </CardTitle>
          <CardDescription>{template.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <img 
            src={template.thumbnail} 
            alt={template.name}
            className="w-20 h-12 object-cover rounded"
          />
          <div>
            <h3 className="font-semibold">{template.name}</h3>
            <p className="text-sm text-gray-600">Duration: {template.duration} | Category: {template.category}</p>
          </div>
        </div>

        {templateVariables.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Template Variables</h3>
            <div className="grid gap-4">
              {templateVariables.map((variable) => (
                <div key={variable} className="space-y-2">
                  <label className="text-sm font-medium capitalize">
                    {variable.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={variableValues[variable] || ''}
                    onChange={(e) => handleVariableChange(variable, e.target.value)}
                    placeholder={`Enter ${variable.replace(/_/g, ' ')}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800">
              This template is ready to use without additional variables. Click "Create Video" to generate your video.
            </p>
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button
            onClick={handleCreateVideo}
            disabled={isGenerating || !canCreateVideo}
            size="lg"
            className="px-8"
          >
            <Video className="h-4 w-4 mr-2" />
            {isGenerating ? "Creating Video..." : "Create Video"}
          </Button>
        </div>

        {templateVariables.length > 0 && !canCreateVideo && (
          <p className="text-center text-sm text-gray-600">
            Please fill in all required variables before creating the video.
          </p>
        )}
      </CardContent>
    </Card>
  );
}