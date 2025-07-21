
import { useView } from "@/contexts/ViewContext";
import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboard } from "./admin/AdminDashboard";
import { UserDashboard } from "./UserDashboard";
import { AssetLibrary } from "./AssetLibrary";
import { InventoryDisplay } from "./inventory/InventoryDisplay";
import { VideoTemplatesTab } from "./VideoTemplatesTab";
import { UserModule } from "./user/UserModule";
import { SocialProfiles } from "./SocialProfiles";
import { Button } from "./ui/button";
import { Loading } from "./ui/loading";
import { Library, Package, Video, User, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function MainContent() {
  const { isAdmin, activeTab, setActiveTab } = useView();
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  // Show loading while checking authentication
  if (loading) {
    return <Loading className="min-h-screen" />;
  }

  // Redirect to sign in if not authenticated
  if (!user) {
    navigate('/auth/signin');
    return null;
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }



  return (
    <div className="space-y-6">
      {/* Tab Navigation for User Mode */}
      <div className="flex space-x-1 border-b">
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
          variant={activeTab === 'social' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('social')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Share2 className="h-4 w-4" />
          <span>Social Profiles</span>
        </Button>

        <Button 
          variant={activeTab === 'user' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('user')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <User className="h-4 w-4" />
          <span>User Account</span>
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'inventory' && <InventoryDisplay />}
      {activeTab === 'library' && <AssetLibrary />}
      {activeTab === 'templates' && <VideoTemplatesTab />}
      {activeTab === 'social' && <SocialProfiles />}
      {activeTab === 'user' && <UserModule />}
    </div>
  );
}
