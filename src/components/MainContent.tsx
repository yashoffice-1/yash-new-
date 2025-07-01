
import { useView } from "@/contexts/ViewContext";
import { AdminDashboard } from "./admin/AdminDashboard";
import { UserDashboard } from "./UserDashboard";
import { AssetLibrary } from "./AssetLibrary";
import { InventoryDisplay } from "./inventory/InventoryDisplay";
import { VideoTemplatesTab } from "./VideoTemplatesTab";
import { VideoTemplateUtility } from "./VideoTemplateUtility";
import { useState } from "react";
import { Button } from "./ui/button";
import { Library, Package, Video, Clapperboard } from "lucide-react";

export function MainContent() {
  const { isAdmin } = useView();
  const [activeTab, setActiveTab] = useState<'inventory' | 'library' | 'templates' | 'video-utility'>('inventory');

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation for User Mode */}
      <div className="flex space-x-4 border-b">
        <Button 
          variant={activeTab === 'inventory' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('inventory')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Package className="h-4 w-4" />
          <span>Enhanced Product Generator</span>
        </Button>
        
        <Button 
          variant={activeTab === 'library' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('library')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Library className="h-4 w-4" />
          <span>Asset Library</span>
        </Button>

        <Button 
          variant={activeTab === 'templates' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('templates')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Video className="h-4 w-4" />
          <span>Video Templates</span>
        </Button>

        <Button 
          variant={activeTab === 'video-utility' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('video-utility')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Clapperboard className="h-4 w-4" />
          <span>Video Template</span>
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'inventory' && <InventoryDisplay />}
      {activeTab === 'library' && <AssetLibrary />}
      {activeTab === 'templates' && <VideoTemplatesTab />}
      {activeTab === 'video-utility' && <VideoTemplateUtility />}
    </div>
  );
}
