
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { TemplateGrid } from "./templates/TemplateGrid";
import { TemplateRequestDialog } from "./templates/TemplateRequestDialog";
import { OnboardingDialog } from "./templates/OnboardingDialog";
import { TemplateHeader } from "./templates/TemplateHeader";
import { TemplateLoadingState } from "./templates/TemplateLoadingState";
import { EmptyTemplatesState } from "./templates/EmptyTemplatesState";
import { TemplateVideoCreator } from "./templates/TemplateVideoCreator";
import { templateManager } from "@/api/template-manager";

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

export function VideoTemplatesTab() {
  const { toast } = useToast();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showOnboardingDialog, setShowOnboardingDialog] = useState(false);
  const [selectedTemplateForCreation, setSelectedTemplateForCreation] = useState<VideoTemplate | null>(null);

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
          heygenTemplateId: template.id
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
    setSelectedTemplateForCreation(template);
  };

  const handleBackToTemplates = () => {
    setSelectedTemplateForCreation(null);
  };

  // Show error state if template fetching fails completely
  if (error) {
    toast({
      title: "Template Loading Error",
      description: "Unable to load templates. Please try refreshing the page.",
      variant: "destructive",
    });
  }

  // Show template video creator if a template is selected
  if (selectedTemplateForCreation) {
    return (
      <TemplateVideoCreator 
        template={selectedTemplateForCreation}
        onBack={handleBackToTemplates}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <TemplateHeader
          onOpenOnboarding={() => setShowOnboardingDialog(true)}
          onScheduleMeeting={handleScheduleMeeting}
          onRequestTemplate={handleRequestTemplate}
        />
        <CardContent>
          {isLoading ? (
            <TemplateLoadingState />
          ) : templates && templates.length > 0 ? (
            <TemplateGrid 
              templates={templates} 
              onTemplateSelect={handleTemplateSelect}
            />
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
    </div>
  );
}
