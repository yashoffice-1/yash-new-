
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/data_display/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { User, CreditCard, Settings, Library, BarChart3 } from "lucide-react";
import { AvatarWithInitials } from "@/components/ui/UI_Elements/avatar-with-initials";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { PersonalInfo } from "./PersonalInfo";
import { BillingSection } from "./BillingSection";
import { SettingsSection } from "./SettingsSection";
import { LibrarySection } from "./LibrarySection";
import { UserAnalyticsDashboard } from "./analytics/UserAnalyticsDashboard";

export function UserModule() {
  const [activeTab, setActiveTab] = useState("personal");
  const { user } = useAuth();
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      {/* User Profile Summary */}
      {user && (
        <Card className={`${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <AvatarWithInitials 
                initials={user.initials} 
                size="lg"
              />
              <div>
                <CardTitle className={`text-xl ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>{user.displayName}</CardTitle>
                <CardDescription className={`text-base ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {user.email}
                </CardDescription>
                <p className={`text-sm mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card className={`${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <CardHeader>
          <CardTitle className={`${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>Account Settings</CardTitle>
          <CardDescription className={`${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Manage your account settings, billing, and integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full grid-cols-5 ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'
            }`}>
              <TabsTrigger value="personal" className={`flex items-center space-x-2 ${
                theme === 'dark' ? 'data-[state=active]:bg-gray-600 data-[state=active]:text-white' : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
              }`}>
                <User className="h-4 w-4" />
                <span>Personal Info</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className={`flex items-center space-x-2 ${
                theme === 'dark' ? 'data-[state=active]:bg-gray-600 data-[state=active]:text-white' : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
              }`}>
                <CreditCard className="h-4 w-4" />
                <span>Billing</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className={`flex items-center space-x-2 ${
                theme === 'dark' ? 'data-[state=active]:bg-gray-600 data-[state=active]:text-white' : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
              }`}>
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
              <TabsTrigger value="library" className={`flex items-center space-x-2 ${
                theme === 'dark' ? 'data-[state=active]:bg-gray-600 data-[state=active]:text-white' : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
              }`}>
                <Library className="h-4 w-4" />
                <span>Library</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className={`flex items-center space-x-2 ${
                theme === 'dark' ? 'data-[state=active]:bg-gray-600 data-[state=active]:text-white' : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
              }`}>
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
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

            <TabsContent value="analytics" className="space-y-4">
              <UserAnalyticsDashboard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
