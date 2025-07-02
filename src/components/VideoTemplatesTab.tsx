
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

  // Fetch user's assigned templates dynamically
  const { data: templates, isLoading } = useQuery({
    queryKey: ['video-templates'],
    queryFn: async () => {
      const assignedTemplateIds = [
        "bccf8cfb2b1e422dbc425755f1b7dc67",
        "3bb2bf2276754c0ea6b235db9409f508", 
        "47a53273dcd0428bbe7bf960b8bf7f02",
        "aeec955f97a6476d88e4547adfeb3c97"
      ];

      try {
        const templatePromises = assignedTemplateIds.map(async (templateId) => {
          try {
            const response = await fetch(`/api/templates/${templateId}`);
            
            if (response.ok) {
              return await response.json();
            } else {
              return {
                id: templateId,
                name: `Template ${templateId.slice(-8)}`,
                description: "Custom video template",
                thumbnail: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop",
                category: "Custom",
                duration: "30s",
                status: "active",
                heygenTemplateId: templateId
              };
            }
          } catch (error) {
            console.log(`Template ${templateId} not found, using fallback`);
            return {
              id: templateId,
              name: `Template ${templateId.slice(-8)}`,
              description: "Custom video template",
              thumbnail: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop",
              category: "Custom",
              duration: "30s",
              status: "active",
              heygenTemplateId: templateId
            };
          }
        });

        const fetchedTemplates = await Promise.all(templatePromises);
        return fetchedTemplates.filter(template => template !== null);
      } catch (error) {
        console.error('Error fetching templates:', error);
        
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
