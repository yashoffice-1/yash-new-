
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TemplateGrid } from "./templates/TemplateGrid";
import { TemplateRequestDialog } from "./templates/TemplateRequestDialog";
import { OnboardingDialog } from "./templates/OnboardingDialog";
import { TemplateHeader } from "./templates/TemplateHeader";
import { TemplateLoadingState } from "./templates/TemplateLoadingState";
import { EmptyTemplatesState } from "./templates/EmptyTemplatesState";

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

  // Fetch templates from HeyGen API via Supabase function
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['heygen-templates'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('heygen-templates');
        
        if (error) {
          throw new Error(error.message);
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch templates');
        }

        // Transform HeyGen templates to our format
        const transformedTemplates = data.templates.map((template: any) => ({
          id: template.template_id || template.id,
          name: template.name || `Template ${template.template_id?.slice(-8) || 'Unknown'}`,
          description: template.description || 'HeyGen video template',
          thumbnail: template.thumbnail || template.preview_url || 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop',
          category: template.category || 'Custom',
          duration: template.duration || '30s',
          status: 'active' as const,
          heygenTemplateId: template.template_id || template.id
        }));

        // Filter to only assigned templates for this user
        const assignedTemplateIds = [
          "bccf8cfb2b1e422dbc425755f1b7dc67",
          "3bb2bf2276754c0ea6b235db9409f508", 
          "47a53273dcd0428bbe7bf960b8bf7f02",
          "aeec955f97a6476d88e4547adfeb3c97"
        ];

        const userTemplates = transformedTemplates.filter((template: VideoTemplate) => 
          assignedTemplateIds.includes(template.id)
        );

        console.log('Fetched and filtered templates:', userTemplates);
        return userTemplates;

      } catch (error) {
        console.error('Error fetching HeyGen templates:', error);
        
        // Fallback to hardcoded templates if API fails
        return assignedTemplateIds.map(templateId => ({
          id: templateId,
          name: `Template ${templateId.slice(-8)}`,
          description: "Custom video template",
          thumbnail: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop",
          category: "Custom",
          duration: "30s",
          status: "active" as const,
          heygenTemplateId: templateId
        }));
      }
    },
    retry: 1,
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

  // Show error state if HeyGen API fails completely
  if (error && (!templates || templates.length === 0)) {
    toast({
      title: "Template Loading Error",
      description: "Unable to load templates from HeyGen. Using fallback templates.",
      variant: "destructive",
    });
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
            <TemplateGrid templates={templates} />
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
