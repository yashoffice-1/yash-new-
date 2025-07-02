
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Eye, EyeOff } from "lucide-react";

export function IntegrationsSettings() {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="space-y-6">
      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>API Keys</span>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Lock className="h-3 w-3" />
              <span>Superadmin Only</span>
            </Badge>
          </CardTitle>
          <CardDescription>
            External service API keys (managed by superadmin)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heygen-api">HeyGen API Key</Label>
              <Input
                id="heygen-api"
                type="password"
                value="hg_••••••••••••••••••••••••••••••••"
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="runwayml-api">RunwayML API Key</Label>
              <Input
                id="runwayml-api"
                type="password"
                value="rml_••••••••••••••••••••••••••••••••"
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopify-api">Shopify API Key</Label>
              <Input
                id="shopify-api"
                type="password"
                value="shpat_••••••••••••••••••••••••••••••••"
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-drive-api">Google Drive API Key</Label>
              <Input
                id="google-drive-api"
                type="password"
                value="gd_••••••••••••••••••••••••••••••••"
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>FTP Configuration</span>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Lock className="h-3 w-3" />
              <span>Superadmin Only</span>
            </Badge>
          </CardTitle>
          <CardDescription>
            FTP server settings for file transfers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ftp-host">FTP Host</Label>
              <Input
                id="ftp-host"
                value="ftp.example.com"
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ftp-username">FTP Username</Label>
              <Input
                id="ftp-username"
                value="user_••••••••"
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ftp-password">FTP Password</Label>
              <div className="relative">
                <Input
                  id="ftp-password"
                  type={showPasswords.ftp ? "text" : "password"}
                  value="••••••••••••••••"
                  disabled
                  className="bg-gray-50 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('ftp')}
                  disabled
                >
                  {showPasswords.ftp ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ftp-path">FTP Path</Label>
              <Input
                id="ftp-path"
                value="/uploads/videos/"
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Integration settings are managed by the system administrator. 
              Contact support if you need to update these configurations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
