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
}

interface TemplateVideoCreatorProps {
  template: VideoTemplate;
  onBack: () => void;
}

export function TemplateVideoCreator({ template, onBack }: TemplateVideoCreatorProps) {
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
        const templateDetail = await templateManager.getTemplateDetail(template.id);
        
        console.log('Raw template detail response:', templateDetail);
        
        if (templateDetail) {
          console.log('Template variables found:', templateDetail.variables);
          console.log('Template variables length:', templateDetail.variables.length);
          setTemplateVariables(templateDetail.variables);
          
          // Initialize variable values with default suggestions
          const initialValues: Record<string, string> = {};
          templateDetail.variables.forEach(variable => {
            // Provide smart defaults based on variable names
            if (variable.toLowerCase().includes('product')) {
              initialValues[variable] = 'Premium Product Name';
            } else if (variable.toLowerCase().includes('brand')) {
              initialValues[variable] = 'Your Brand';
            } else if (variable.toLowerCase().includes('price')) {
              initialValues[variable] = '$99.99';
            } else if (variable.toLowerCase().includes('discount')) {
              initialValues[variable] = '25%';
            } else if (variable.toLowerCase().includes('cta') || variable.toLowerCase().includes('call')) {
              initialValues[variable] = 'Shop Now';
            } else if (variable.toLowerCase().includes('website') || variable.toLowerCase().includes('url')) {
              initialValues[variable] = 'https://yourwebsite.com';
            } else if (variable.toLowerCase().includes('image')) {
              initialValues[variable] = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop';
            } else {
              initialValues[variable] = `Enter ${variable.replace(/_/g, ' ')}`;
            }
          });
          console.log('Initial variable values:', initialValues);
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
  }, [template.id, toast]);

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
      
      // Go back to templates after successful creation
      onBack();
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
    variableValues[variable] && variableValues[variable].trim() !== '' && 
    !variableValues[variable].startsWith('Enter ')
  );

  if (isLoadingTemplate) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
            <div>
              <CardTitle>Loading Template...</CardTitle>
              <CardDescription>Fetching template details</CardDescription>
            </div>
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
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Video className="h-5 w-5" />
              <span>Create Video: {template.name}</span>
            </CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </div>
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