import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Play, Eye, Calendar, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
}

interface TemplateVariable {
  id: string;
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
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
    if (!selectedTemplate) return;

    setLoading(true);
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
        return;
      }

      // Call the generation API
      const response = await fetch('/api/ai/heygen/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          variables: generationForm.variables
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Template generation started successfully",
        });
        setShowGenerationDialog(false);
        setGenerationForm({ templateId: '', variables: {} });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to generate template",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate template",
        variant: "destructive",
      });
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
    return template.canUse && !isTemplateExpired(template);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Templates</h2>
        <Badge variant="outline">
          {templates.filter(t => canUseTemplate(t)).length} Available
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your templates...</span>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Assigned</h3>
            <p className="text-gray-500">
              You don't have any templates assigned yet. Contact your admin to get access to video templates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <div className="aspect-video bg-gray-100 relative">
                {template.thumbnailUrl ? (
                  <img
                    src={template.thumbnailUrl}
                    alt={template.templateName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400">No Preview</span>
                  </div>
                )}
                {!canUseTemplate(template) && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Badge variant="destructive">
                      {isTemplateExpired(template) ? 'Expired' : 'Inactive'}
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm">{template.templateName}</h3>
                  <div className="flex gap-1">
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
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {template.templateDescription}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>Used {template.usageCount} times</span>
                  {template.lastUsedAt && (
                    <span>Last: {new Date(template.lastUsedAt).toLocaleDateString()}</span>
                  )}
                </div>

                {template.expiresAt && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <Calendar className="h-3 w-3" />
                    <span>Expires: {new Date(template.expiresAt).toLocaleDateString()}</span>
                  </div>
                )}

                {template.variables && template.variables.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((variable) => (
                        <Badge key={variable.id} variant="outline" className="text-xs">
                          {variable.name} ({variable.type})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={() => handleSelectTemplateForGeneration(template)}
                  disabled={!canUseTemplate(template)}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-1" />
                  {canUseTemplate(template) ? 'Generate Video' : 'Not Available'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Generation Dialog */}
      <Dialog open={showGenerationDialog} onOpenChange={setShowGenerationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Video with Template</DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Template</Label>
                <p className="text-sm font-medium">{selectedTemplate.templateName}</p>
                {selectedTemplate.templateDescription && (
                  <p className="text-xs text-gray-600 mt-1">{selectedTemplate.templateDescription}</p>
                )}
              </div>

              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div>
                  <Label>Template Variables</Label>
                  <div className="space-y-3 mt-2">
                    {selectedTemplate.variables.map((variable) => (
                      <div key={variable.id}>
                        <Label className="text-xs">
                          {variable.name} {variable.required && '*'}
                        </Label>
                        {variable.type === 'text' && (
                          <Input
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
                          />
                        )}
                        {variable.type === 'image' && (
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
                            placeholder="Enter image URL"
                            required={variable.required}
                          />
                        )}
                        {variable.type === 'number' && (
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
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateTemplate}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate Video
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowGenerationDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 