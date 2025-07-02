
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Video, Settings, Calendar, Plus } from "lucide-react";

interface TemplateHeaderProps {
  onOpenOnboarding: () => void;
  onScheduleMeeting: () => void;
  onRequestTemplate: () => void;
}

export function TemplateHeader({ onOpenOnboarding, onScheduleMeeting, onRequestTemplate }: TemplateHeaderProps) {
  return (
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
            onClick={onOpenOnboarding}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Brand Onboarding</span>
          </Button>
          <Button
            variant="outline"
            onClick={onScheduleMeeting}
            className="flex items-center space-x-2"
          >
            <Calendar className="h-4 w-4" />
            <span>Schedule Meeting</span>
          </Button>
          <Button onClick={onRequestTemplate} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Request Template</span>
          </Button>
        </div>
      </CardTitle>
      <CardDescription>
        Manage your custom video templates powered by HeyGen. Create personalized video content that matches your brand voice and style.
      </CardDescription>
    </CardHeader>
  );
}
