
import { useEffect } from "react";
import { useView } from "@/contexts/ViewContext";
import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboard } from "../admin/dashboard/AdminDashboard";
import { InventoryDisplay } from "../inventory/display/InventoryDisplay";
import { AssetLibrary } from "../inventory/assets/AssetLibrary";
import { VideoTemplatesTab } from "../templates/VideoTemplatesTab";
import { UserModule } from "./UserModule";
import { SocialProfiles } from "./social/SocialProfiles";
import { SocialAccountManager } from "./social/SocialAccountManager";
import { Button } from "../ui/forms/button";
import { Loading } from "../ui/UI_Elements/loading";
import { Library, Package, Video, User, Share2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Define the tab type to match ViewContext
type TabType = 'inventory' | 'library' | 'templates' | 'user' | 'social';

export function MainContent() {
  const { isAdmin, activeTab, setActiveTab } = useView();
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const socialPlatform = searchParams.get('platform');

  // Restore tab state from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab && ['inventory', 'library', 'templates', 'user', 'social'].includes(savedTab)) {
      setActiveTab(savedTab as any);
      localStorage.removeItem('activeTab'); // Clean up after restoring
    }
  }, [setActiveTab]);

  // Auto-switch to social tab if platform parameter is present
  useEffect(() => {
    if (socialPlatform && activeTab !== 'social') {
      setActiveTab('social');
    }
  }, [socialPlatform, activeTab, setActiveTab]);

  // Handle tab switching and clear platform parameter when switching to non-social tabs
  const handleTabSwitch = (newTab: TabType) => {
    setActiveTab(newTab);
    
    // Clear platform parameter when switching to non-social tabs
    if (newTab !== 'social' && socialPlatform) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('platform');
      setSearchParams(newSearchParams);
    }
  };

  // Show loading while checking authentication
  if (loading) {
    return <Loading className="min-h-screen" />;
  }

  // Redirect to sign in if not authenticated
  if (!user) {
    console.log('🔍 MainContent: No user found, redirecting to signin');
    // Add a small delay to prevent rapid redirects
    setTimeout(() => {
      navigate('/auth/signin');
    }, 100);
    return <Loading className="min-h-screen" />;
  }

  console.log('🔍 MainContent: User authenticated:', user.email);

  // Show admin dashboard for admin and superadmin users
  if (isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation for User Mode */}
      <div className="flex space-x-1 border-b">
        <Button 
          variant={activeTab === 'inventory' ? 'default' : 'ghost'} 
          onClick={() => handleTabSwitch('inventory')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Package className="h-4 w-4" />
          <span>Enhanced Product Generator</span>
        </Button>
        
        <Button 
          variant={activeTab === 'library' ? 'default' : 'ghost'} 
          onClick={() => handleTabSwitch('library')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Library className="h-4 w-4" />
          <span>Asset Library</span>
        </Button>

        <Button 
          variant={activeTab === 'templates' ? 'default' : 'ghost'} 
          onClick={() => handleTabSwitch('templates')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Video className="h-4 w-4" />
          <span>Video Templates</span>
        </Button>

        <Button 
          variant={activeTab === 'social' ? 'default' : 'ghost'} 
          onClick={() => handleTabSwitch('social')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Share2 className="h-4 w-4" />
          <span>Social Profiles</span>
        </Button>

        <Button 
          variant={activeTab === 'user' ? 'default' : 'ghost'} 
          onClick={() => handleTabSwitch('user')}
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
      {activeTab === 'social' && (
        socialPlatform ? <SocialAccountManager /> : <SocialProfiles />
      )}
      {activeTab === 'user' && <UserModule />}
    </div>
  );
}
