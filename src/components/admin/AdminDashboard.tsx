
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiKeyManager } from "./ApiKeyManager";
import { HeyGenVideoManager } from "../HeyGenVideoManager";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'keys' | 'videos'>('keys');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        <p className="text-muted-foreground">Manage API keys and test the complete user flow</p>
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
          variant={activeTab === 'videos' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('videos')}
          className="rounded-b-none"
        >
          Video Manager
        </Button>
      </div>

      {activeTab === 'keys' && <ApiKeyManager />}
      {activeTab === 'videos' && <HeyGenVideoManager />}
    </div>
  );
}
