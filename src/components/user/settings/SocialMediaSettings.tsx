
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Share2, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

export function SocialMediaSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [socialData, setSocialData] = useState({
    facebook: "https://facebook.com/yourpage",
    instagram: "https://instagram.com/yourhandle",
    linkedin: "https://linkedin.com/company/yourcompany",
    youtube: "https://youtube.com/c/yourchannel"
  });

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast({
      title: "Social Media Links Saved",
      description: "Your social media links have been updated successfully.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Share2 className="h-5 w-5" />
          <span>Social Media Links</span>
        </CardTitle>
        <CardDescription>
          Configure your social media accounts for future auto-posting integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Coming Soon:</strong> Auto-posting feature will use these links to automatically share your generated videos to your social media accounts.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="facebook" className="flex items-center space-x-2">
              <Facebook className="h-4 w-4 text-blue-600" />
              <span>Facebook Page URL</span>
            </Label>
            <Input
              id="facebook"
              value={socialData.facebook}
              onChange={(e) => setSocialData({ ...socialData, facebook: e.target.value })}
              placeholder="https://facebook.com/yourpage"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram" className="flex items-center space-x-2">
              <Instagram className="h-4 w-4 text-pink-600" />
              <span>Instagram Profile URL</span>
            </Label>
            <Input
              id="instagram"
              value={socialData.instagram}
              onChange={(e) => setSocialData({ ...socialData, instagram: e.target.value })}
              placeholder="https://instagram.com/yourhandle"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin" className="flex items-center space-x-2">
              <Linkedin className="h-4 w-4 text-blue-700" />
              <span>LinkedIn Company Page URL</span>
            </Label>
            <Input
              id="linkedin"
              value={socialData.linkedin}
              onChange={(e) => setSocialData({ ...socialData, linkedin: e.target.value })}
              placeholder="https://linkedin.com/company/yourcompany"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="youtube" className="flex items-center space-x-2">
              <Youtube className="h-4 w-4 text-red-600" />
              <span>YouTube Channel URL</span>
            </Label>
            <Input
              id="youtube"
              value={socialData.youtube}
              onChange={(e) => setSocialData({ ...socialData, youtube: e.target.value })}
              placeholder="https://youtube.com/c/yourchannel"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isLoading} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>{isLoading ? "Saving..." : "Save Social Media Links"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
