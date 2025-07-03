
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Tag, Image, Smartphone } from "lucide-react";

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

interface TemplateGridProps {
  templates: VideoTemplate[];
  onTemplateSelect?: (template: VideoTemplate) => void;
}

export function TemplateGrid({ templates, onTemplateSelect }: TemplateGridProps) {
  const handleUseTemplate = (template: VideoTemplate) => {
    console.log('Using template:', template);
    onTemplateSelect?.(template);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAspectRatioIcon = (aspectRatio?: string) => {
    return aspectRatio === 'portrait' ? Smartphone : Image;
  };

  const getAspectRatioClass = (aspectRatio?: string) => {
    return aspectRatio === 'portrait' ? 'aspect-[9/16]' : 'aspect-video';
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Portrait templates in a row */}
      {templates.filter(t => t.aspectRatio === 'portrait').length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Mobile Templates (Portrait)</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {templates.filter(t => t.aspectRatio === 'portrait').map((template) => {
              const AspectIcon = getAspectRatioIcon(template.aspectRatio);
              return (
                <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in hover-scale">
                  <div className="relative">
                    <div className={`relative bg-gray-100 ${getAspectRatioClass(template.aspectRatio)}`}>
                      {template.thumbnail && template.thumbnail !== 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop' ? (
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-full h-full object-cover rounded-t-lg"
                          onError={(e) => {
                            console.log(`Template thumbnail failed for ${template.id}:`, template.thumbnail);
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center rounded-t-lg">
                          <div className="text-white text-center">
                            <AspectIcon className="h-8 w-8 mx-auto mb-2" />
                            <div className="text-xs font-medium">Mobile Template</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-2 left-2 flex items-center space-x-1">
                      <Badge variant="secondary" className="text-xs flex items-center space-x-1">
                        <AspectIcon className="h-3 w-3" />
                        <span>{template.aspectRatio}</span>
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge 
                        className={`text-xs text-white ${getStatusColor(template.status)}`}
                      >
                        {template.status}
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{template.duration}</span>
                    </div>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm leading-tight">
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  
                   <CardContent className="pt-0 space-y-2">
                     <div className="text-xs text-gray-500">
                       <div>Variables: {template.variables?.length || 0}</div>
                     </div>

                     {template.variables && template.variables.length > 0 && (
                       <div className="text-xs">
                         <div className="font-medium text-gray-700 mb-1">Required Variables:</div>
                         <div className="flex flex-wrap gap-1">
                           {template.variables.map((variable) => (
                             <span 
                               key={variable}
                               className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-xs"
                             >
                               {variable.replace(/_/g, ' ')}
                             </span>
                           ))}
                         </div>
                       </div>
                     )}
                     
                    <Button
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                      disabled={template.status !== 'active'}
                      className="w-full flex items-center justify-center space-x-1 text-xs"
                    >
                      <Play className="h-3 w-3" />
                      <span>Use</span>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Landscape templates in a different layout */}
      {templates.filter(t => t.aspectRatio !== 'portrait').length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Image className="h-5 w-5" />
            <span>Desktop Templates (Landscape)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.filter(t => t.aspectRatio !== 'portrait').map((template) => {
              const AspectIcon = getAspectRatioIcon(template.aspectRatio);
              return (
                <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in hover-scale">
                  <div className="relative">
                    <div className={`relative bg-gray-100 ${getAspectRatioClass(template.aspectRatio)}`}>
                      {template.thumbnail && template.thumbnail !== 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop' ? (
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-full h-full object-cover rounded-t-lg"
                          onError={(e) => {
                            console.log(`Template thumbnail failed for ${template.id}:`, template.thumbnail);
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center rounded-t-lg">
                          <div className="text-white text-center">
                            <AspectIcon className="h-8 w-8 mx-auto mb-2" />
                            <div className="text-xs font-medium">Landscape Template</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-2 left-2 flex items-center space-x-1">
                      <Badge variant="secondary" className="text-xs flex items-center space-x-1">
                        <AspectIcon className="h-3 w-3" />
                        <span>{template.aspectRatio || 'landscape'}</span>
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge 
                        className={`text-xs text-white ${getStatusColor(template.status)}`}
                      >
                        {template.status}
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{template.duration}</span>
                    </div>
                  </div>
                  
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-sm space-y-1">
                      <div>{template.description}</div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Variables: {template.variables?.length || 0}</span>
                        <span>Duration: {template.duration}</span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Tag className="h-3 w-3" />
                        <span>ID: {template.heygenTemplateId?.slice(-8) || template.id.slice(-8)}</span>
                      </div>
                      <div className="text-right">
                        <div>Category: {template.category}</div>
                      </div>
                    </div>

                    {template.variables && template.variables.length > 0 && (
                      <div className="text-xs">
                        <div className="font-medium text-gray-700 mb-1">Required Variables:</div>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((variable) => (
                            <span 
                              key={variable}
                              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                            >
                              {variable.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                      disabled={template.status !== 'active'}
                      className="w-full flex items-center justify-center space-x-2"
                    >
                      <Play className="h-3 w-3" />
                      <span>Use Template</span>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
