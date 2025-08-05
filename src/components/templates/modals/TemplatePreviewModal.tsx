import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Tag, Image, Smartphone, X } from "lucide-react";

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
}

interface TemplatePreviewModalProps {
  template: VideoTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: (template: VideoTemplate) => void;
}

export function TemplatePreviewModal({ 
  template, 
  open, 
  onOpenChange, 
  onUseTemplate 
}: TemplatePreviewModalProps) {
  console.log('TemplatePreviewModal render:', { template: template?.id, open, templateExists: !!template });
  
  if (!template) {
    console.log('TemplatePreviewModal: No template provided, returning null');
    return null;
  }

  const AspectIcon = template.aspectRatio === 'portrait' ? Smartphone : Image;
  const isPortrait = template.aspectRatio === 'portrait';

  const handleUseTemplate = () => {
    onUseTemplate(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isPortrait ? 'max-w-2xl' : 'max-w-5xl'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AspectIcon className="h-6 w-6" />
              <span>{template.name}</span>
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>{template.aspectRatio || 'landscape'}</span>
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Preview */}
          <div className="flex justify-center">
            <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${
              isPortrait ? 'w-80 aspect-[9/16]' : 'w-full max-w-2xl aspect-video'
            }`}>
              <img
                src={template.thumbnail}
                alt={template.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=800&h=450&fit=crop';
                }}
              />
              
              {/* Overlay with play button */}
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                <div className="bg-white bg-opacity-20 rounded-full p-4 backdrop-blur-sm">
                  <Play className="h-12 w-12 text-white" />
                </div>
              </div>

              {/* Duration overlay */}
              <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{template.duration}</span>
              </div>

              {/* Aspect ratio badge */}
              <div className="absolute top-4 left-4">
                <Badge variant="secondary" className="flex items-center space-x-1 bg-white bg-opacity-90">
                  <AspectIcon className="h-3 w-3" />
                  <span>{template.aspectRatio || 'landscape'}</span>
                </Badge>
              </div>
            </div>
          </div>

          {/* Template Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Template Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span>{template.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{template.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Format:</span>
                    <span>{template.aspectRatio === 'portrait' ? 'Mobile (9:16)' : 'Desktop (16:9)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Variables:</span>
                    <span>{template.variables?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Template ID:</span>
                    <div className="flex items-center space-x-2">
                      <Tag className="h-3 w-3" />
                      <span className="font-mono text-xs">{template.heygenTemplateId?.slice(-8) || template.id.slice(-8)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-600">{template.description}</p>
              </div>
            </div>

            {/* Variables */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Required Variables</h3>
                {template.variables && template.variables.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 mb-3">
                      This template requires {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''} to be configured:
                    </div>
                    <div className="grid gap-2">
                      {template.variables.map((variable, index) => (
                        <div 
                          key={variable}
                          className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                            <div className="text-xs text-gray-500">
                              {variable.includes('image') ? 'Image URL' : 
                               variable.includes('url') ? 'Website URL' : 'Text Content'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                    This template is ready to use without any variable configuration.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              Preview the template layout and required variables before creating your video
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close Preview
              </Button>
              <Button 
                onClick={handleUseTemplate}
                disabled={template.status !== 'active'}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Use This Template</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}