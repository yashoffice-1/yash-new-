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
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [generationProgress, setGenerationProgress] = useState(0);

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

      if (template.heygenTemplateId) {
        // For HeyGen templates, use the proper API with template ID and variables
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/ai/heygen/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId: template.heygenTemplateId,
            variables: variableValues, // Send the actual template variables
            instruction: `Create a video using the ${template.name} template with the following content: ${Object.entries(variableValues).map(([key, value]) => `${key}: ${value}`).join(', ')}`,
            formatSpecs: {
              channel: 'youtube',
              format: 'mp4'
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HeyGen API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
          toast({
            title: "✅ Request Sent Successfully",
            description: `Video generation request sent to HeyGen using template "${template.name}". Check the Asset Library to monitor progress!`,
          });
          
          // Start monitoring progress
          if (data.data?.videoId) {
            startProgressMonitoring(data.data.videoId);
          }
        } else {
          throw new Error(data.error || 'Failed to generate video');
        }
      } else {
        // For non-HeyGen templates, use the generic video generation
      const instruction = `Create video using template ${template.id} with product: ${Object.entries(variableValues).map(([key, value]) => `${key}: ${value}`).join(', ')}`;
      await generateVideo(instruction, undefined, 'heygen');
      
      toast({
        title: "✅ Request Sent Successfully",
        description: `Video generation request sent to HeyGen using template "${template.name}". Check the Asset Library to monitor progress!`,
      });
      }
    } catch (error) {
      console.error('Error creating video:', error);
      toast({
        title: "❌ Request Failed",
        description: "Failed to send video generation request. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Progress monitoring function
  const startProgressMonitoring = async (videoId: string) => {
    setGenerationStatus('processing');
    setGenerationProgress(0);
    
    // Simulate realistic progress since HeyGen doesn't provide progress percentage
    let simulatedProgress = 10;
    const progressInterval = setInterval(() => {
      if (simulatedProgress < 90) {
        simulatedProgress += Math.random() * 15 + 5; // 5-20% increments
        setGenerationProgress(Math.min(90, simulatedProgress));
      }
    }, 3000); // Update every 3 seconds
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/ai/heygen/status/${videoId}`);
        const data = await response.json();
        
        if (data.success) {
          const { status, videoUrl, errorMessage } = data.data;
          
          if (status === 'completed') {
            clearInterval(progressInterval);
            setGenerationStatus('completed');
            setGenerationProgress(100);
            toast({
              title: "🎉 Video Generation Complete!",
              description: "Your video has been generated successfully. Check the Asset Library to view it.",
            });
            return; // Stop monitoring
          } else if (status === 'failed') {
            clearInterval(progressInterval);
            setGenerationStatus('failed');
            setGenerationProgress(0);
            toast({
              title: "❌ Video Generation Failed",
              description: errorMessage || "Video generation failed. Please try again.",
              variant: "destructive",
            });
            return; // Stop monitoring
          } else if (status === 'processing') {
            // Continue monitoring with simulated progress
            setTimeout(checkStatus, 10000); // Check every 10 seconds
          }
        }
      } catch (error) {
        console.error('Error checking video status:', error);
        clearInterval(progressInterval);
        setGenerationStatus('failed');
      }
    };
    
    // Start monitoring
    setTimeout(checkStatus, 5000); // Start checking after 5 seconds
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
          {generationStatus === 'processing' && (
            <div className="w-full max-w-md space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Generating Video...</span>
                <span>{Math.round(generationProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-600">
                Video generation in progress. This typically takes 2-5 minutes. You can check the Asset Library for updates.
              </p>
            </div>
          )}
          
          {generationStatus === 'completed' && (
            <div className="w-full max-w-md space-y-4 text-center">
              <div className="text-green-600 font-semibold">✅ Video Generation Complete!</div>
              <p className="text-sm text-gray-600">
                Your video has been generated successfully. Check the Asset Library to view it.
              </p>
            </div>
          )}
          
          {generationStatus === 'failed' && (
            <div className="w-full max-w-md space-y-4 text-center">
              <div className="text-red-600 font-semibold">❌ Video Generation Failed</div>
              <p className="text-sm text-gray-600">
                Something went wrong. Please try again.
              </p>
              <Button
                onClick={handleCreateVideo}
                disabled={isGenerating || !canCreateVideo}
                size="lg"
                className="px-8"
              >
                <Video className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}
          
          {generationStatus === 'idle' && (
          <Button
            onClick={handleCreateVideo}
            disabled={isGenerating || !canCreateVideo}
            size="lg"
            className="px-8"
          >
            <Video className="h-4 w-4 mr-2" />
            {isGenerating ? "Creating Video..." : "Create Video"}
          </Button>
          )}
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