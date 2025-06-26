
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiKeyManager } from "./ApiKeyManager";
import { TestingModule } from "./TestingModule";
import { useView } from "@/contexts/ViewContext";
import { Eye } from "lucide-react";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'keys' | 'testing'>('keys');
  const { toggleView } = useView();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground">Manage API keys and test the complete user flow</p>
        </div>
        
        <Button onClick={toggleView} variant="outline" className="flex items-center space-x-2">
          <Eye className="h-4 w-4" />
          <span>View as User</span>
        </Button>
      </div>

      <div className="flex space-x-4 border-b">
        <Button 
          variant={activeTab === 'keys' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('keys')}
          className="rounded-b-none"
        >
          API Keys
        </Button>
        <Button 
          variant={activeTab === 'testing' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('testing')}
          className="rounded-b-none"
        >
          Testing Module
        </Button>
      </div>

      {activeTab === 'keys' && <ApiKeyManager />}
      {activeTab === 'testing' && <TestingModule />}
    </div>
  );
}
