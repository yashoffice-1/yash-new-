
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Plus, Settings, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TemplateGrid } from "./templates/TemplateGrid";
import { TemplateRequestDialog } from "./templates/TemplateRequestDialog";
import { OnboardingDialog } from "./templates/OnboardingDialog";

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
      // Get user's assigned template IDs
      const assignedTemplateIds = [
        "bccf8cfb2b1e422dbc425755f1b7dc67",
        "3bb2bf2276754c0ea6b235db9409f508", 
        "47a53273dcd0428bbe7bf960b8bf7f02",
        "aeec955f97a6476d88e4547adfeb3c97"
      ];

      // Template configurations
      const templateConfigurations: Record<string, VideoTemplate> = {
        "bccf8cfb2b1e422dbc425755f1b7dc67": {
          id: "bccf8cfb2b1e422dbc425755f1b7dc67",
          name: "Product Showcase",
          description: "Perfect for highlighting product features and benefits",
          thumbnail: "/placeholder.svg",
          category: "Product",
          duration: "30s",
          status: "active",
          heygenTemplateId: "bccf8cfb2b1e422dbc425755f1b7dc67"
        },
        "3bb2bf2276754c0ea6b235db9409f508": {
          id: "3bb2bf2276754c0ea6b235db9409f508",
          name: "Feature Highlight",
          description: "Emphasize key features and benefits of your product",
          thumbnail: "/placeholder.svg",
          category: "Feature",
          duration: "25s",
          status: "active",
          heygenTemplateId: "3bb2bf2276754c0ea6b235db9409f508"
        },
        "47a53273dcd0428bbe7bf960b8bf7f02": {
          id: "47a53273dcd0428bbe7bf960b8bf7f02",
          name: "Brand Story",
          description: "Tell your brand story with engaging visuals",
          thumbnail: "/placeholder.svg",
          category: "Brand",
          duration: "60s",
          status: "active",
          heygenTemplateId: "47a53273dcd0428bbe7bf960b8bf7f02"
        },
        "aeec955f97a6476d88e4547adfeb3c97": {
          id: "aeec955f97a6476d88e4547adfeb3c97",
          name: "Social Media Promo",
          description: "Create engaging social media promotional videos",
          thumbnail: "/placeholder.svg",
          category: "Social",
          duration: "15s",
          status: "active",
          heygenTemplateId: "aeec955f97a6476d88e4547adfeb3c97"
        }
      };
      
      // Build available templates based on user's assigned IDs
      const availableTemplates = assignedTemplateIds
        .map(id => templateConfigurations[id])
        .filter(template => template !== undefined);
      
      return availableTemplates;
    },
  });

  const handleRequestTemplate = () => {
    setShowRequestDialog(true);
  };

  const handleScheduleMeeting = () => {
    // Open the Google Calendar in a new window
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
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5" />
              <span>Video Templates</span>
              <Badge variant="outline">HeyGen Integration</Badge>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowOnboardingDialog(true)}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Brand Onboarding</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleScheduleMeeting}
                className="flex items-center space-x-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Schedule Meeting</span>
              </Button>
              <Button onClick={handleRequestTemplate} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Request Template</span>
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage your custom video templates powered by HeyGen. Create personalized video content that matches your brand voice and style.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <TemplateGrid templates={templates} />
          ) : (
            <div className="text-center py-12">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Available</h3>
              <p className="text-gray-500 mb-6">
                You don't have any video templates assigned yet. Get started by completing your brand onboarding or requesting a custom template.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setShowOnboardingDialog(true)}
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Complete Brand Onboarding</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRequestTemplate}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Request Custom Template</span>
                </Button>
              </div>
            </div>
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
