import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/forms/button";
import { useToast } from "@/hooks/ui/use-toast";
import { ArrowLeft, Video } from "lucide-react";
import { templateManager } from "@/api/template-manager";
import { templatesAPI } from "@/api/backend-client";

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
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

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
    if (!canCreateVideo || isGenerating) return;

    setIsGenerating(true);
    setGenerationStatus('processing');
    setGenerationProgress(0);

    try {
      // Call the generation API using templatesAPI
      const response = await templatesAPI.generateTemplate({
        templateId: template.heygenTemplateId || template.id,
        variables: variableValues,
        instruction: `Generate video using template: ${template.name}`
      });

      if (response.data.success) {
        const videoId = response.data.data.videoId;
        
        // Start progress monitoring
        startProgressMonitoring(videoId);
        
        toast({
          title: "🎬 Video Generation Started",
          description: "Your video is being generated. This may take a few minutes.",
        });
      } else {
        throw new Error(response.data.error || 'Failed to start video generation');
      }
    } catch (error) {
      console.error('Error creating video:', error);
      setIsGenerating(false);
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
    
    // 5-minute progress simulation (300 seconds)
    const totalDuration = 300; // 5 minutes in seconds
    const targetProgress = 92; // Target 92% before completion
    let elapsedTime = 0;
    
    const progressInterval = setInterval(() => {
      elapsedTime += 3; // Update every 3 seconds
      const progressPercentage = Math.min(targetProgress, (elapsedTime / totalDuration) * targetProgress);
      setGenerationProgress(progressPercentage);
      
      // Stop simulation at 5 minutes or when we reach target
      if (elapsedTime >= totalDuration || progressPercentage >= targetProgress) {
        clearInterval(progressInterval);
        // Keep progress at 92% until we get completion status
        setGenerationProgress(targetProgress);
      }
    }, 3000); // Update every 3 seconds
    
    const checkStatus = async () => {
      try {
        const statusResponse = await templatesAPI.getGenerationStatus(videoId); // Using apiClient
        const data = statusResponse.data;
        
        if (data.success) {
          const { status, videoUrl, errorMessage } = data.data;
          
          if (status === 'completed') {
            clearInterval(progressInterval);
            setGenerationStatus('completed');
            setGenerationProgress(100); // Jump to 100% on completion
            setIsGenerating(false);
            toast({
              title: "🎉 Video Generation Complete!",
              description: "Your video has been generated successfully. Check the Asset Library to view it.",
            });
            return; // Stop monitoring
          } else if (status === 'failed') {
            clearInterval(progressInterval);
            setGenerationStatus('failed');
            setGenerationProgress(0);
            setIsGenerating(false);
            toast({
              title: "❌ Video Generation Failed",
              description: errorMessage || "Video generation failed. Please try again.",
              variant: "destructive",
            });
            return; // Stop monitoring
          } else if (status === 'processing') {
            // Continue monitoring with simulated progress
            setTimeout(checkStatus, 30000); // Check every 30 seconds instead of 10
          }
        }
      } catch (error) {
        console.error('Error checking video status:', error);
        clearInterval(progressInterval); // Clear interval on error
        setGenerationStatus('failed');
        setIsGenerating(false);
      }
    };
    
    // Start checking status after 10 seconds
    setTimeout(checkStatus, 10000);
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