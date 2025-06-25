
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiKeyManager } from "./ApiKeyManager";
import { TestingModule } from "./TestingModule";

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage API keys and test the platform functionality</p>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="testing">Testing Module</TabsTrigger>
        </TabsList>
        
        <TabsContent value="api-keys">
          <ApiKeyManager />
        </TabsContent>
        
        <TabsContent value="testing">
          <TestingModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}
