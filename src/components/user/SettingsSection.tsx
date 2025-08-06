
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/data_display/tabs";
import { IntegrationsSettings } from "./settings/IntegrationsSettings";
import { TemplatesSettings } from "./settings/TemplatesSettings";
import { BrandSettings } from "./settings/BrandSettings";
import { SocialMediaSettings } from "./settings/SocialMediaSettings";
import { Plug, FileText, Palette, Share2 } from "lucide-react";

export function SettingsSection() {
  const [activeSettingsTab, setActiveSettingsTab] = useState("integrations");

  return (
    <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="integrations" className="flex items-center space-x-2">
          <Plug className="h-4 w-4" />
          <span>Integrations</span>
        </TabsTrigger>
        <TabsTrigger value="templates" className="flex items-center space-x-2">
          <FileText className="h-4 w-4" />
          <span>Templates</span>
        </TabsTrigger>
        <TabsTrigger value="brand" className="flex items-center space-x-2">
          <Palette className="h-4 w-4" />
          <span>Brand</span>
        </TabsTrigger>
        <TabsTrigger value="social" className="flex items-center space-x-2">
          <Share2 className="h-4 w-4" />
          <span>Social Media</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="integrations" className="space-y-4">
        <IntegrationsSettings />
      </TabsContent>

      <TabsContent value="templates" className="space-y-4">
        <TemplatesSettings />
      </TabsContent>

      <TabsContent value="brand" className="space-y-4">
        <BrandSettings />
      </TabsContent>

      <TabsContent value="social" className="space-y-4">
        <SocialMediaSettings />
      </TabsContent>
    </Tabs>
  );
}
