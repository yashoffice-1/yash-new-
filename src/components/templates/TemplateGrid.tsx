
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Tag } from "lucide-react";

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <div className="relative">
            <img
              src={template.thumbnail}
              alt={template.name}
              className="w-full h-32 object-cover bg-gray-100"
              onError={(e) => {
                // Fallback to a placeholder if thumbnail fails to load
                e.currentTarget.src = 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop';
              }}
            />
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                {template.category}
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
              {template.name.includes('Template') ? template.name : `Template: ${template.name}`}
            </CardTitle>
            <CardDescription className="text-sm">
              {template.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Tag className="h-3 w-3" />
                <span>ID: {template.heygenTemplateId || template.id.slice(-8)}</span>
              </div>
              
              <Button
                size="sm"
                onClick={() => handleUseTemplate(template)}
                disabled={template.status !== 'active'}
                className="flex items-center space-x-1"
              >
                <Play className="h-3 w-3" />
                <span>Use Template</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
