import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Play, Eye, Calendar, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/ui/use-toast';
import { templatesAPI } from '@/api/backend-client';

interface UserTemplateAccess {
  id: string;
  templateName: string;
  templateDescription?: string;
  thumbnailUrl?: string;
  category?: string;
  aspectRatio?: string;
  canUse: boolean;
  usageCount: number;
  lastUsedAt?: string;
  expiresAt?: string;
  variables?: TemplateVariable[];
  externalId?: string; // HeyGen template ID
}

interface TemplateVariable {
  id: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  charLimit?: number;
}

interface TemplateGenerationForm {
  templateId: string;
  variables: Record<string, string>;
}

export function UserTemplateLibrary() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<UserTemplateAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<UserTemplateAccess | null>(null);
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);
  const [generationForm, setGenerationForm] = useState<TemplateGenerationForm>({
    templateId: '',
    variables: {}
  });
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch user's assigned templates
  const fetchUserTemplates = async () => {
    setLoading(true);
    try {
      const response = await templatesAPI.getUserTemplates();
      const data = response.data;
      
      if (data.success) {
        setTemplates(data.data || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch templates",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTemplates();
  }, []);

  // Handle template selection for generation
  const handleSelectTemplateForGeneration = (template: UserTemplateAccess) => {
    setSelectedTemplate(template);
    setGenerationForm({
      templateId: template.id,
      variables: template.variables ? template.variables.reduce((acc, variable) => {
        acc[variable.name] = variable.defaultValue || '';
        return acc;
      }, {} as Record<string, string>) : {}
    });
    setShowGenerationDialog(true);
  };

  // Handle template generation
  const handleGenerateTemplate = async () => {
    if (!selectedTemplate || isGenerating) return;

    setIsGenerating(true);
    setLoading(true);
    setGenerationStatus('processing');
    setGenerationProgress(0);
    
    try {
      // Validate required variables
      const missingRequired = selectedTemplate.variables
        ? selectedTemplate.variables
            .filter(v => v.required && !generationForm.variables[v.name])
            .map(v => v.name)
        : [];
  
      if (missingRequired.length > 0) {
        toast({
          title: "Missing Required Variables",
          description: `Please fill in: ${missingRequired.join(', ')}`,
          variant: "destructive",
        });
        setGenerationStatus('idle');
        setIsGenerating(false);
        setLoading(false);
        return;
      }

      const exceededLimits = selectedTemplate.variables
        ? selectedTemplate.variables
            .filter(v => v.charLimit && generationForm.variables[v.name])
            .filter(v => generationForm.variables[v.name].length > v.charLimit)
            .map(v => `${v.name} (${generationForm.variables[v.name].length}/${v.charLimit})`)
        : [];
  
      if (exceededLimits.length > 0) {
        toast({
          title: "Character Limit Exceeded",
          description: `Please shorten: ${exceededLimits.join(', ')}`,
          variant: "destructive",
        });
        setGenerationStatus('idle');
        setIsGenerating(false);
        setLoading(false);
        return;
      }
  
      // Call the generation API
      const response = await templatesAPI.generateTemplate({
        templateId: selectedTemplate.externalId || selectedTemplate.id,
        variables: generationForm.variables,
        instruction: `Generate video using template: ${selectedTemplate.templateName}`
      });

      if (response.data.success) {
        const videoId = response.data.data.videoId;
        
        // Start 5-minute progress monitoring
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
            setGenerationProgress(targetProgress);
          }
        }, 3000);
        
        // Check actual status every 30 seconds
        const checkStatus = async () => {
          try {
            const statusResponse = await templatesAPI.getGenerationStatus(videoId);
            const statusData = statusResponse.data;
            const { status, videoUrl, errorMessage } = statusData.data;
            
            if (status === 'completed') {
              clearInterval(progressInterval);
              setGenerationStatus('completed');
              setGenerationProgress(100);
              setIsGenerating(false);
              toast({
                title: "🎉 Video Generation Complete!",
                description: "Your video has been generated successfully. Check the Asset Library to view it.",
              });
              setShowGenerationDialog(false);
              setGenerationForm({ templateId: '', variables: {} });
              return;
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
              return;
            } else if (status === 'processing') {
              // Continue monitoring
              setTimeout(checkStatus, 30000); // Check every 30 seconds instead of 10
            }
          } catch (error) {
            console.error('Error checking video status:', error);
            // Don't clear interval on error, just continue monitoring
            setTimeout(checkStatus, 30000); // Check every 30 seconds instead of 10
          }
        };
        
        // Start checking status after 10 seconds
        setTimeout(checkStatus, 10000);
        
        toast({
          title: "Success",
          description: "Template generation started successfully",
        });
      } else {
        const error = response.data;
        toast({
          title: "Error",
          description: error.error || "Failed to generate template",
          variant: "destructive",
        });
        setGenerationStatus('failed');
        setIsGenerating(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate template",
        variant: "destructive",
      });
      setGenerationStatus('failed');
      setIsGenerating(false);
    } finally {
      setLoading(false);
    }
  };

  // Check if template is expired
  const isTemplateExpired = (template: UserTemplateAccess) => {
    if (!template.expiresAt) return false;
    return new Date(template.expiresAt) < new Date();
  };

  // Check if template can be used
  const canUseTemplate = (template: UserTemplateAccess) => {
    const isExpired = isTemplateExpired(template);
    const canUse = template.canUse && !isExpired;
    
    // Debug logging
    console.log(`Template ${template.templateName}:`, {
      canUse: template.canUse,
      expiresAt: template.expiresAt,
      isExpired,
      finalCanUse: canUse
    });
    
    return canUse;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">My Templates</h2>
          <p className="text-gray-600">
            Generate custom videos using your assigned templates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {templates.filter(t => canUseTemplate(t)).length}
              </div>
              <div className="text-sm text-gray-500">Available</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">
                {templates.filter(t => !canUseTemplate(t)).length}
              </div>
              <div className="text-sm text-gray-500">Unavailable</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {templates.length}
              </div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-300"></div>
          <div className="text-xs text-gray-500">
            {templates.filter(t => t.variables && t.variables.length > 0).length} with variables
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading your templates...</h3>
            <p className="text-gray-500">Please wait while we fetch your assigned templates</p>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 bg-gray-50">
          <CardContent className="text-center py-16">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Templates Assigned</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              You don't have any templates assigned yet. Contact your admin to get access to video templates.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>Admin will assign templates here</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative group">
                {template.thumbnailUrl ? (
                  <img
                    src={template.thumbnailUrl}
                    alt={template.templateName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Play className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-gray-500 text-sm">No Preview</span>
                    </div>
                  </div>
                )}
                {!canUseTemplate(template) && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm">
                    <Badge variant="destructive" className="text-sm px-3 py-1">
                      {isTemplateExpired(template) ? 'Expired' : 'Inactive'}
                    </Badge>
                  </div>
                )}
                {template.variables && template.variables.length > 0 && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs bg-white/90 backdrop-blur">
                      {template.variables.length} vars
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight">
                    {template.templateName}
                  </h3>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    {template.category && (
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    )}
                    {template.aspectRatio && (
                      <Badge variant="outline" className="text-xs">
                        {template.aspectRatio}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {template.templateDescription && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                    {template.templateDescription}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Used {template.usageCount} times</span>
                  </div>
                  {template.lastUsedAt && (
                    <span className="text-xs">
                      Last: {new Date(template.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {template.expiresAt && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 p-2 bg-orange-50 rounded-md">
                    <Calendar className="h-3 w-3 text-orange-500" />
                    <span className="text-orange-700">
                      Expires: {new Date(template.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {template.variables && template.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 3).map((variable) => (
                        <Badge key={variable.id} variant="outline" className="text-xs">
                          {variable.name}
                        </Badge>
                      ))}
                      {template.variables.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.variables.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={() => handleSelectTemplateForGeneration(template)}
                  disabled={!canUseTemplate(template)}
                  className={`w-full transition-all duration-200 ${
                    canUseTemplate(template)
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {canUseTemplate(template) ? 'Generate Video' : 'Not Available'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Generation Dialog */}
      <Dialog open={showGenerationDialog} onOpenChange={setShowGenerationDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-600" />
              Generate Video with Template
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Fill in the template variables to generate your custom video
            </p>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-6">
              {/* Template Info Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-4">
                  {selectedTemplate.thumbnailUrl && (
                    <div className="w-16 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={selectedTemplate.thumbnailUrl}
                        alt={selectedTemplate.templateName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {selectedTemplate.templateName}
                    </h3>
                    {selectedTemplate.templateDescription && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {selectedTemplate.templateDescription}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {selectedTemplate.category && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedTemplate.category}
                        </Badge>
                      )}
                      {selectedTemplate.aspectRatio && (
                        <Badge variant="outline" className="text-xs">
                          {selectedTemplate.aspectRatio}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Variables Section */}
              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <Label className="text-base font-medium">Template Variables</Label>
                    <Badge variant="outline" className="text-xs">
                      {selectedTemplate.variables.filter(v => v.required).length} required
                    </Badge>
                  </div>
                  
                  <div className="grid gap-4">
                    {selectedTemplate.variables.map((variable, index) => (
                      <div key={variable.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            {variable.name}
                            {variable.required && (
                              <span className="text-red-500 text-xs">*</span>
                            )}
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            {variable.type}
                          </Badge>
                        </div>
                        
                        {variable.type === 'text' && (
                        <div className="space-y-1">
                          <Input
                            value={generationForm.variables[variable.name] || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Check character limit if defined
                              if (variable.charLimit && value.length > variable.charLimit) {
                                return; // Don't update if over limit
                              }
                              setGenerationForm({
                                ...generationForm,
                                variables: {
                                  ...generationForm.variables,
                                  [variable.name]: value
                                }
                              });
                            }}
                            placeholder={variable.defaultValue || `Enter ${variable.name}`}
                            required={variable.required}
                            maxLength={variable.charLimit || undefined}
                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            {variable.defaultValue && (
                              <span>Default: {variable.defaultValue}</span>
                            )}
                            {variable.charLimit && (
                              <span className={`${
                                (generationForm.variables[variable.name] || '').length > variable.charLimit * 0.9 
                                  ? 'text-orange-500' 
                                  : 'text-gray-500'
                              }`}>
                                {(generationForm.variables[variable.name] || '').length}/{variable.charLimit} characters
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                        
                        {variable.type === 'image' && (
                          <div className="space-y-1">
                            <Input
                              type="url"
                              value={generationForm.variables[variable.name] || ''}
                              onChange={(e) => setGenerationForm({
                                ...generationForm,
                                variables: {
                                  ...generationForm.variables,
                                  [variable.name]: e.target.value
                                }
                              })}
                              placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                              required={variable.required}
                              className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500">
                              Provide a direct link to an image file
                            </p>
                          </div>
                        )}
                        
                        {variable.type === 'number' && (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              value={generationForm.variables[variable.name] || ''}
                              onChange={(e) => setGenerationForm({
                                ...generationForm,
                                variables: {
                                  ...generationForm.variables,
                                  [variable.name]: e.target.value
                                }
                              })}
                              placeholder={variable.defaultValue || `Enter ${variable.name}`}
                              required={variable.required}
                              className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                            />
                            {variable.defaultValue && (
                              <p className="text-xs text-gray-500">
                                Default: {variable.defaultValue}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Variables Message */}
              {(!selectedTemplate.variables || selectedTemplate.variables.length === 0) && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Play className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    This template doesn't require any variables. Click generate to create your video.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleGenerateTemplate}
                  disabled={loading || isGenerating || generationStatus === 'processing'}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                  size="lg"
                >
                  {loading || isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      {isGenerating ? 'Generating Video...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Generate Video
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowGenerationDialog(false)}
                  size="lg"
                  className="px-6"
                >
                  Cancel
                </Button>
              </div>

              {/* Generation Status */}
              {generationStatus === 'processing' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">Generating your video...</p>
                        <p className="text-sm text-blue-700">
                          {generationProgress >= 92 
                            ? "Almost complete - finalizing video..."
                            : `Estimated time remaining: ${Math.max(1, Math.round((300 - (generationProgress / 92 * 300)) / 60))} minutes`
                          }
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">Progress</span>
                        <span className="text-sm font-bold text-blue-600">{Math.round(generationProgress)}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${generationProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {generationStatus === 'completed' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Video generation complete!</p>
                      <p className="text-sm text-green-700">
                        Your video has been generated successfully. Check the Asset Library to view it.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {generationStatus === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-red-900">Video generation failed</p>
                      <p className="text-sm text-red-700">
                        There was an error generating your video. Please try again.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 