
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useView } from "@/contexts/ViewContext";
import { TemplateGrid } from "./templates/TemplateGrid";
import { TemplateRequestDialog } from "./templates/TemplateRequestDialog";
import { OnboardingDialog } from "./templates/OnboardingDialog";
import { TemplateHeader } from "./templates/TemplateHeader";
import { TemplateLoadingState } from "./templates/TemplateLoadingState";
import { EmptyTemplatesState } from "./templates/EmptyTemplatesState";
import { TemplateVideoCreator } from "./templates/TemplateVideoCreator";
import { VideoTemplateUtility } from "./VideoTemplateUtility";
import { templateManager } from "@/api/template-manager";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Eye, Plus, Search, Filter, Grid, List, Play } from "lucide-react";

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

interface HeyGenTemplate {
  template_id: string;
  name: string;
  description?: string;
  thumbnail_image_url?: string;
  aspect_ratio?: string;
  duration?: string;
  category?: string;
  templateDetails?: any;
}

export function VideoTemplatesTab() {
  const { toast } = useToast();
  const { selectedProduct, setSelectedProduct } = useView();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false);
  const [selectedTemplateForCreation, setSelectedTemplateForCreation] = useState<VideoTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewTemplate, setPreviewTemplate] = useState<HeyGenTemplate | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Fetch templates using the new template manager
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['client-templates', 'default'], // Could be dynamic based on user's client
    queryFn: async () => {
      try {
        console.log('Fetching client templates using template manager');
        
        const templateDetails = await templateManager.getClientTemplates('default');
        
        // Transform to VideoTemplate format
        const videoTemplates: VideoTemplate[] = templateDetails.map(template => ({
          id: template.id,
          name: template.name,
          description: template.description,
          thumbnail: template.thumbnail || 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop',
          category: template.category,
          duration: template.duration,
          status: 'active' as const,
          heygenTemplateId: template.id,
          variables: template.variables || [],
          aspectRatio: template.aspectRatio || 'landscape'
        }));

        console.log('Successfully fetched templates via template manager:', videoTemplates);
        return videoTemplates;

      } catch (error) {
        console.error('Error fetching templates via template manager:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch HeyGen templates automatically when tab is opened
  const { data: heygenData, isLoading: heygenLoading, error: heygenError } = useQuery({
    queryKey: ['heygen-templates'],
    queryFn: async () => {
      try {
        console.log('Fetching HeyGen templates automatically...');
        
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/templates/heygen/list`);
        
        if (!response.ok) {
          throw new Error(`Backend API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch HeyGen templates');
        }
        
        console.log('Successfully fetched HeyGen templates:', data.data);
        return data.data;
        
      } catch (error) {
        console.error('Error fetching HeyGen templates:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleRequestTemplate = () => {
    setShowRequestDialog(true);
  };

  const handleScheduleMeeting = () => {
    window.open(
      'https://calendar.google.com/calendar/embed?src=c_b88aa561ec9cf8c4af90b9d75dbc8c7c747e52294707acfdf3ed7e0319558b4f%40group.calendar.google.com&ctz=America%2FNew_York',
      '_blank',
      'width=800,height=600,scrollbars=yes,resizable=yes'
    );
  };

  const handleOnboardingComplete = (data: any) => {
    console.log('Onboarding data:', data);
    setShowOnboardingDialog(false);
    toast({
      title: "Onboarding Complete",
      description: "Your brand information has been saved. Our team will create custom templates for you.",
    });
  };

  const handleTemplateSelect = (template: VideoTemplate) => {
    console.log('Template selected in VideoTemplatesTab:', template);
    setSelectedTemplateForCreation(template);
  };

  const handleBackToTemplates = () => {
    setSelectedTemplateForCreation(null);
  };

  const handleBackFromVideoUtility = () => {
    setSelectedProduct(null);
  };

  const handleAddHeyGenTemplate = (template: HeyGenTemplate) => {
    toast({
      title: "Template Added",
      description: `${template.name} has been added to your template library.`,
    });
    // Here you would add the template to the client's assigned templates
  };

  const handleHeyGenTemplateSelect = async (template: HeyGenTemplate) => {
    console.log('HeyGen template selected:', template);
    
    try {
      // Fetch template details from HeyGen API
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/templates/heygen/detail/${template.template_id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Convert HeyGen template to VideoTemplate format with details
          const videoTemplate: VideoTemplate = {
            id: template.template_id,
            name: template.name,
            description: template.description || '',
            thumbnail: template.thumbnail_image_url || 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop',
            category: template.category || 'custom',
            duration: template.duration || '30s',
            status: 'active' as const,
            heygenTemplateId: template.template_id,
            variables: data.data.variables ? Object.keys(data.data.variables) : [],
            aspectRatio: template.aspect_ratio === 'portrait' ? 'portrait' : 'landscape',
            // Pass the template details to avoid re-fetching
            templateDetails: data.data
          };
          setSelectedTemplateForCreation(videoTemplate);
        } else {
          throw new Error('Failed to fetch template details');
        }
      } else {
        throw new Error(`HTTP error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching HeyGen template details:', error);
      toast({
        title: "Template Error",
        description: "Could not load template details. Please try again.",
        variant: "destructive",
      });
    }
  };

    const handlePlayTemplatePreview = async (template: HeyGenTemplate) => {
    setIsLoadingPreview(true);
    setPreviewTemplate(template);
    
    try {
      // Fetch template details to get template structure
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/templates/heygen/detail/${template.template_id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Show template details without generating demo video
          setPreviewTemplate({
            ...template,
            templateDetails: data.data
          });
          
          toast({
            title: "Template Details Loaded",
            description: "Template information has been loaded successfully.",
          });
        }
      }
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast({
        title: "Template Details Error",
        description: "Could not load template details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewTemplate(null);
    setIsLoadingPreview(false);
  };

  // Show error state if template fetching fails completely
  if (error) {
    toast({
      title: "Template Loading Error",
      description: "Unable to load templates. Please try refreshing the page.",
      variant: "destructive",
    });
  }

  // Show video template utility if a product is selected (from inventory)
  if (selectedProduct) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handleBackFromVideoUtility}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Templates</span>
          </Button>
          <div className="text-sm text-gray-600">
            Creating video for: <span className="font-medium">{selectedProduct.name}</span>
          </div>
        </div>
        <VideoTemplateUtility product={selectedProduct} />
      </div>
    );
  }

  // Show video creator if a template is selected
  if (selectedTemplateForCreation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handleBackToTemplates}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Templates</span>
          </Button>
          <div className="text-sm text-gray-600">
            Using template: <span className="font-medium">{selectedTemplateForCreation.name}</span>
          </div>
        </div>
        <TemplateVideoCreator template={selectedTemplateForCreation} />
      </div>
    );
  }

  // Show HeyGen templates by default
  return (
    <div className="space-y-6">
      <Card>
        <TemplateHeader
          onOpenOnboarding={() => setShowOnboardingDialog(true)}
          onScheduleMeeting={handleScheduleMeeting}
          onRequestTemplate={handleRequestTemplate}
        />
        <CardContent>
          {heygenLoading ? (
            <TemplateLoadingState />
          ) : heygenError ? (
            <div className="text-center space-y-4">
              <div className="text-red-500 text-lg">Failed to load HeyGen templates</div>
              <div className="text-sm text-gray-600">
                {heygenError instanceof Error ? heygenError.message : 'Unknown error occurred'}
              </div>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : heygenData?.templates && heygenData.templates.length > 0 ? (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search HeyGen templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {['all', ...Array.from(new Set(heygenData.templates.map((t: HeyGenTemplate) => t.category).filter(Boolean)))].map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </option>
                    ))}
                  </select>
                  
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Templates Grid */}
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "space-y-4"
              }>
                {heygenData.templates
                  .filter((template: HeyGenTemplate) => {
                    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
                    return matchesSearch && matchesCategory;
                  })
                  .map((template: HeyGenTemplate) => (
                  <Card key={template.template_id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div className="relative">
                      <div className="aspect-video bg-gray-100">
                        {template.thumbnail_image_url ? (
                          <img
                            src={template.thumbnail_image_url}
                            alt={template.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                            <div className="text-white text-center">
                              <Eye className="h-8 w-8 mx-auto mb-2" />
                              <div className="text-xs font-medium">Template Preview</div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="absolute top-2 left-2 flex items-center space-x-1">
                        <Badge variant="secondary" className="text-xs">
                          {template.aspect_ratio || 'landscape'}
                        </Badge>
                        {template.duration && (
                          <Badge variant="outline" className="text-xs">
                            {template.duration}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <CardContent className="pt-4">
                      <h3 className="text-sm font-semibold line-clamp-2 mb-2">
                        {template.name}
                      </h3>
                      
                      {template.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                          {template.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {template.category && (
                            <Badge variant="outline" className="text-xs">
                              {template.category}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1">
                                                     <Button
                             size="sm"
                             variant="outline"
                             onClick={() => handlePlayTemplatePreview(template)}
                             disabled={isLoadingPreview}
                           >
                             <Eye className="h-3 w-3 mr-1" />
                             {isLoadingPreview ? 'Loading...' : 'Preview'}
                           </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleHeyGenTemplateSelect(template)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Use
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAddHeyGenTemplate(template)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Results Summary */}
              <div className="text-sm text-gray-600 text-center">
                Showing {heygenData.templates.filter((t: HeyGenTemplate) => {
                  const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       t.description?.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
                  return matchesSearch && matchesCategory;
                }).length} of {heygenData.templates.length} HeyGen templates
              </div>
            </div>
          ) : (
            <EmptyTemplatesState
              onOpenOnboarding={() => setShowOnboardingDialog(true)}
              onRequestTemplate={handleRequestTemplate}
            />
          )}
        </CardContent>
      </Card>

      <TemplateRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
      />

      <OnboardingDialog
        open={showOnboardingDialog}
        onOpenChange={setShowOnboardingDialog}
        onComplete={handleOnboardingComplete}
      />

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Template Preview: {previewTemplate.name}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClosePreview}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
                             {/* Template Preview */}
               <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                 {previewTemplate.thumbnail_image_url ? (
                   <img
                     src={previewTemplate.thumbnail_image_url}
                     alt={previewTemplate.name}
                     className="w-full h-full object-cover"
                   />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center">
                     <div className="text-center">
                       {isLoadingPreview ? (
                         <div className="flex items-center space-x-2">
                           <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                           <span>Loading template details...</span>
                         </div>
                       ) : (
                         <div className="text-gray-500">
                           <Eye className="h-12 w-12 mx-auto mb-2" />
                           <p>Template Preview</p>
                         </div>
                       )}
                     </div>
                   </div>
                 )}
               </div>

              {/* Template Details */}
              <div className="space-y-2">
                <h4 className="font-medium">{previewTemplate.name}</h4>
                {previewTemplate.description && (
                  <p className="text-sm text-gray-600">{previewTemplate.description}</p>
                )}
                
                <div className="flex items-center space-x-2">
                  {previewTemplate.category && (
                    <Badge variant="outline" className="text-xs">
                      {previewTemplate.category}
                    </Badge>
                  )}
                  {previewTemplate.duration && (
                    <Badge variant="secondary" className="text-xs">
                      {previewTemplate.duration}
                    </Badge>
                  )}
                  {previewTemplate.aspect_ratio && (
                    <Badge variant="outline" className="text-xs">
                      {previewTemplate.aspect_ratio}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-4">
                <Button
                  onClick={() => {
                    handleHeyGenTemplateSelect(previewTemplate);
                    handleClosePreview();
                  }}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Use This Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddHeyGenTemplate(previewTemplate)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Library
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
