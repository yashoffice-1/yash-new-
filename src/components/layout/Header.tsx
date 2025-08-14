
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/forms/button";
import { AvatarWithInitials } from "@/components/ui/UI_Elements/avatar-with-initials";
import { Badge } from "@/components/ui/data_display/badge";
import { LogOut, Package } from "lucide-react";
import { useGeneration } from "@/contexts/GenerationContext";
import { RealtimeStatusIndicator } from "@/components/common/RealtimeStatusIndicator";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { globalGenerationResults, setShowFirstModal } = useGeneration();

  const handleSignOut = () => {
    signOut();
    navigate('/auth/signin');
  };

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/89de7e4b-f2ba-4d6e-b0dd-47971ec53def.png" 
            alt="FeedGenesis Logo" 
            className="h-8 w-auto"
          />
          <h1 className="text-xl font-bold">FeedGenesis</h1>
        </div>
        
        {/* User Info and Logout */}
        {user && (
          <div className="flex items-center space-x-4">
            {/* Real-time Status Indicator */}
            <RealtimeStatusIndicator />
            
            {/* Generation Results Notification - Button to open first modal */}
            {globalGenerationResults.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFirstModal(true)}
                className="flex items-center space-x-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">View Results</span>
                <Badge variant="secondary" className="ml-1 bg-green-600 text-white">
                  {globalGenerationResults.length}
                </Badge>
              </Button>
            ) : (
              <div className="text-xs text-gray-500">No results</div>
            )}
            
            <div className="flex items-center space-x-3">
              <AvatarWithInitials 
                initials={user.initials} 
                size="sm"
              />
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
