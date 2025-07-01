
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Plus, Eye, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TemplateRequestDialog } from "./TemplateRequestDialog";

interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  duration: string;
  style: string;
  status: 'active' | 'draft' | 'pending';
  createdAt: string;
}

interface VideoTemplatesTabProps {
  selectedProduct: any;
}

export function VideoTemplatesTab({ selectedProduct }: VideoTemplatesTabProps) {
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate loading templates - in real app, this would fetch from HeyGen API
    const loadTemplates = async () => {
      setIsLoading(true);
      try {
        // Mock data - replace with actual HeyGen API call
        const mockTemplates: VideoTemplate[] = [
          {
            id: '1',
            name: 'Product Showcase',
            description: 'Professional product presentation with call-to-action',
            thumbnail: '/placeholder.svg',
            duration: '30s',
            style: 'Modern',
            status: 'active',
            createdAt: '2024-01-15'
          },
          {
            id: '2',
            name: 'Brand Story',
            description: 'Emotional brand storytelling template',
            thumbnail: '/placeholder.svg',
            duration: '60s',
            style: 'Cinematic',
            status: 'active',
            createdAt: '2024-01-10'
          }
        ];
        
        // Simulate API delay
        setTimeout(() => {
          setTemplates(mockTemplates);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading templates:', error);
        toast({
          title: "Error",
          description: "Failed to load video templates",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, [toast]);

  const handleUseTemplate = (template: VideoTemplate) => {
    toast({
      title: "Template Selected",
      description: `Using template: ${template.name}`,
    });
    // TODO: Integrate with video generation logic
  };

  const handlePreviewTemplate = (template: VideoTemplate) => {
    toast({
      title: "Preview",
      description: `Previewing template: ${template.name}`,
    });
    // TODO: Show template preview modal
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Video Templates</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Video Templates</h3>
          <p className="text-sm text-muted-foreground">
            Use your assigned HeyGen templates to create professional videos
          </p>
        </div>
        <Button onClick={() => setShowRequestDialog(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Request New Template</span>
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No Templates Assigned</h4>
            <p className="text-muted-foreground mb-6">
              You don't have any video templates assigned yet. Request a custom template to get started.
            </p>
            <Button onClick={() => setShowRequestDialog(true)} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Request Your First Template</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge 
                    variant={template.status === 'active' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {template.status}
                  </Badge>
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Duration: {template.duration}</span>
                  <span>Style: {template.style}</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreviewTemplate(template)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    className="flex-1"
                    disabled={template.status !== 'active'}
                  >
                    <Video className="h-3 w-3 mr-1" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        selectedProduct={selectedProduct}
      />
    </div>
  );
}
