
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, CreditCard, Settings, Library } from "lucide-react";
import { PersonalInfo } from "./PersonalInfo";
import { BillingSection } from "./BillingSection";
import { SettingsSection } from "./SettingsSection";
import { LibrarySection } from "./LibrarySection";

export function UserModule() {
  const [activeTab, setActiveTab] = useState("personal");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Account</CardTitle>
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
