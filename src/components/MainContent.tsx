
import { useView } from "@/contexts/ViewContext";
import { AdminDashboard } from "./admin/AdminDashboard";
import { UserDashboard } from "./UserDashboard";
import { AssetLibrary } from "./AssetLibrary";
import { useState } from "react";
import { Button } from "./ui/button";
import { FileText, Image, Library } from "lucide-react";

export function MainContent() {
  const { isAdmin } = useView();
  const [activeTab, setActiveTab] = useState<'generate' | 'library'>('generate');

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation for User Mode */}
      <div className="flex space-x-4 border-b">
        <Button 
          variant={activeTab === 'generate' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('generate')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Image className="h-4 w-4" />
          <span>Generate Content</span>
        </Button>
        <Button 
          variant={activeTab === 'library' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('library')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Library className="h-4 w-4" />
          <span>Asset Library</span>
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'generate' && <UserDashboard />}
      {activeTab === 'library' && <AssetLibrary />}
    </div>
  );
}
