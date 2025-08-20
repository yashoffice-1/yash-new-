
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/forms/button";
import { Input } from "@/components/ui/forms/input";
import { Label } from "@/components/ui/forms/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/forms/select";
import { useToast } from "@/hooks/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Save, HardDrive, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { userAnalyticsAPI } from "@/api/clients/user-analytics-client";

export function PersonalInfo() {
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user analytics for storage info
  const { data: analyticsData } = useQuery({
    queryKey: ['userAnalytics', user?.id],
    queryFn: () => userAnalyticsAPI.getMyAnalytics('30d'),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    timezone: "America/New_York",
    language: "en"
  });

  // Initialize form data with current user data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        timezone: "America/New_York", // Default value
        language: "en" // Default value
      });
    }
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await updateProfile(formData.firstName, formData.lastName);
      
      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Personal Info Updated",
          description: "Your personal information has been saved successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update personal information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your personal details and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                  <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isLoading} className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>{isLoading ? "Saving..." : "Save Changes"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5" />
            <span>Storage Usage</span>
          </CardTitle>
          <CardDescription>
            Your current storage usage and generation costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analyticsData?.data?.storage?.used?.toFixed(2) || '0.00'} GB
              </div>
              <div className="text-sm text-muted-foreground">Storage Used</div>
              <div className="text-xs text-muted-foreground mt-1">
                of {analyticsData?.data?.storage?.total || 10} GB limit
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analyticsData?.data?.storage?.assetCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Assets</div>
              <div className="text-xs text-muted-foreground mt-1">
                {analyticsData?.data?.assets?.videos || 0} videos, {analyticsData?.data?.assets?.images || 0} images
              </div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                ${analyticsData?.data?.costs?.total?.toFixed(4) || '0.0000'}
              </div>
              <div className="text-sm text-muted-foreground">Generation Costs</div>
              <div className="text-xs text-muted-foreground mt-1">
                ${analyticsData?.data?.costs?.perGeneration?.toFixed(4) || '0.0000'} per generation
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/user?tab=analytics'}
              className="mt-2"
            >
              View Detailed Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
