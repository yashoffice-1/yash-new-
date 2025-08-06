
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/data_display/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { User, CreditCard, Settings, Library } from "lucide-react";
import { AvatarWithInitials } from "@/components/ui/UI_Elements/avatar-with-initials";
import { useAuth } from "@/contexts/AuthContext";
import { PersonalInfo } from "./PersonalInfo";
import { BillingSection } from "./BillingSection";
import { SettingsSection } from "./SettingsSection";
import { LibrarySection } from "./LibrarySection";

export function UserModule() {
  const [activeTab, setActiveTab] = useState("personal");
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* User Profile Summary */}
      {user && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <AvatarWithInitials 
                initials={user.initials} 
                size="lg"
              />
              <div>
                <CardTitle className="text-xl">{user.displayName}</CardTitle>
                <CardDescription className="text-base">
                  {user.email}
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-1">
                  Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Manage your account settings, billing, and integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Personal Info</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Billing</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
              <TabsTrigger value="library" className="flex items-center space-x-2">
                <Library className="h-4 w-4" />
                <span>Library</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <PersonalInfo />
            </TabsContent>

            <TabsContent value="billing" className="space-y-4">
              <BillingSection />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <SettingsSection />
            </TabsContent>

            <TabsContent value="library" className="space-y-4">
              <LibrarySection />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
